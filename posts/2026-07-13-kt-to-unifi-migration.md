---
title: KT 공유기 → UniFi (UCG-Fiber + U7 Pro) 마이그레이션 가이드
date: 2026-07-13
categories: [Network, Infra]
tags: [UniFi, Proxmox, Tailscale, HomeAssistant, Homebridge]
feature_image: "https://picsum.photos/2560/600?image=903"
---

가정용 홈랩 환경(Proxmox + HomeAssistant + Tailscale 서브넷 라우터 + Zigbee/ESPresense 등 IoT 기기 약 50대)을 KT 통신사 공유기에서 UniFi로 전환하면서 겪은 이슈와 해결 과정을 정리합니다.

## 환경

- **기존**: KT GIGA WiFi home ax (Router+AP) + GIGA fiber (ONT, 별도 분리)
- **신규**: UCG-Fiber (Cloud Gateway) + U7 Pro (WiFi 7 AP)
- **홈서버**: Proxmox (Beelink S12 Pro, N100), LXC 3개 + VM 2개
  - HomeAssistant (VM, haos12.0)
  - Homebridge (LXC)
  - immich (VM)
  - tailscale-router (LXC, 서브넷 라우터 역할)
- **인증 방식**: KT kt모드 / DHCP 자동 인증 (PPPoE 계정 불필요)
- **기존 서브넷**: `172.30.1.0/24`

## 1. 물리 구성

ONT(GIGA fiber)와 라우터(GIGA WiFi home ax)가 분리된 구성이라, 마이그레이션은 라우터 교체만으로 충분했다.

```
[GIGA fiber = ONT] → [UCG-Fiber WAN 포트(10GbE RJ45)] → [U7 Pro (PoE+)]
```

![UCG-Fiber와 U7 Pro 실제 설치 모습](https://res.cloudinary.com/bx1ml39u/image/upload/v1783949330/kwakky1-blog/2026-07-13-kt-to-unifi-migration/lmy9ihevh8oaqmymi2xr.jpg)

IPTV 미사용 환경이라 VLAN 태깅 관련 이슈는 없었다.

## 2. WiFi 네트워크 구성

기존 IoT 기기 재연결 부담을 최소화하기 위해 2.4/5/6GHz를 단일 SSID로 통합했다.

- SSID: 기존 KT 공유기와 동일 이름/비밀번호 유지
- Radio Band: 2.4GHz, 5GHz, 6GHz 전부 체크
- Fast Roaming(802.11r) / Handoff Suggestions(802.11v): AP 1대 환경에서는 실효성이 낮아 기본값(off) 유지
- Roaming Assistance threshold: Auto 유지 권장 (Manual dBm 튜닝은 멀티 AP 환경에서만 유효)

## 3. 서브넷 마이그레이션

UCG-Fiber의 기본 LAN 서브넷은 `192.168.1.0/24`다. 기존 인프라(Tailscale 서브넷 라우트, 각 서비스 고정 IP)와의 호환을 위해 `172.30.1.0/24`로 변경했다.

**Settings → Networks → Default**

```
Auto-Scale Network: OFF
IPv4 Address: 172.30.1.1
Netmask: /24
```

![UniFi Settings → Networks → Default 서브넷 변경 화면](https://res.cloudinary.com/bx1ml39u/image/upload/v1783949332/kwakky1-blog/2026-07-13-kt-to-unifi-migration/hxzx3yjwhtgb7mcf5gbp.png)

> **주의**: 저장 시 UCG-Fiber의 LAN IP 자체가 즉시 바뀌면서 현재 세션이 끊긴다. 적용 직후 클라이언트가 새 대역의 IP를 재획득하지 못해 일시적으로 게이트웨이 UI 접근이 불가능한 경우가 있었는데, UCG-Fiber 자체를 재부팅하니 정상화되었다. (원인은 명확히 특정하지 못함 — DHCP 서버 재시작 지연으로 추정)

## 4. 트러블슈팅: Tailscale 서브넷 라우터 게이트웨이 오설정

서브넷 변경 후 가장 시간이 오래 걸린 문제. 증상은 다음과 같았다.

```bash
root@tailscale-router:~# tailscale status
100.117.120.68  tailscale-router  ...  offline
# Health check:
#   - Tailscale hasn't received a network map from the coordination server...
#   - Tailscale can't reach the configured DNS servers...
```

### 진단

```bash
# 게이트웨이(UCG-Fiber)는 정상 응답
$ ping -c 3 172.30.1.1
3 packets transmitted, 3 received, 0% packet loss

# 외부는 응답 없음 (커널이 즉시 거부 = 라우팅 테이블 문제 정황)
$ ping -c 3 8.8.8.8
From 172.30.1.50 icmp_seq=1 Destination Host Unreachable

# 라우팅 테이블 확인
$ ip route show
default via 172.30.1.254 dev eth0 onlink
172.30.1.0/24 dev eth0 proto kernel scope link src 172.30.1.50
```

**원인**: 기본 게이트웨이가 `172.30.1.254`(구 KT 공유기 IP)로 고정 설정되어 있었다. Proxmox LXC의 `net0` 설정에서 `gw` 값이 정적으로 박혀 있었던 것이 원인.

### 해결

**임시 조치 (즉시 적용, 재부팅 시 초기화)**

```bash
ip route del default via 172.30.1.254
ip route add default via 172.30.1.1 dev eth0
```

**영구 조치 (Proxmox 호스트에서)**

```bash
# 현재 설정 확인
pct config 103 | grep net
# net0: name=eth0,bridge=vmbr0,firewall=1,gw=172.30.1.254,hwaddr=BC:24:11:09:63:8F,ip=172.30.1.50/24,type=veth

# gw 값만 수정 (다른 필드는 유지)
pct set 103 -net0 name=eth0,bridge=vmbr0,firewall=1,gw=172.30.1.1,hwaddr=BC:24:11:09:63:8F,ip=172.30.1.50/24,type=veth

# 재부팅 후 검증
pct reboot 103
```

## 5. 트러블슈팅: 서비스 DHCP 재할당 지연

`gw` 정적 설정이 없던 기기들(HomeAssistant VM, Homebridge LXC, immich VM)은 서브넷 변경 이후에도 예전 DHCP 임대 정보를 계속 유지하며 UniFi Client 목록에서 offline으로 표시되었다.

```bash
qm config 100 | grep net   # net0: virtio=...,bridge=vmbr0  (정적 게이트웨이 없음)
pct config 101 | grep net  # net0: ...,ip=dhcp,...
qm config 102 | grep net   # net0: virtio=...,bridge=vmbr0,firewall=1
```

**원인**: DHCP 임대 갱신 주기가 도래하기 전까지 리눅스 게스트가 예전 임대 정보를 그대로 유지. 서브넷 자체가 통째로 바뀌는 변경에는 자동 대응하지 않음.

**해결**: 강제 재부팅으로 DHCP 재요청 트리거.

```bash
qm reboot 100   # HomeAssistant
pct reboot 101  # Homebridge
qm reboot 102   # immich (일부 환경에서 QEMU guest agent 응답 지연으로 reboot 실패 가능)
```

> `qm reboot`이 `got unexpected control message` 에러로 실패하는 경우, guest agent 통신 문제일 뿐 VM 자체는 살아있는 경우가 많다. `qm list`로 상태 확인 후 필요 시 강제 재시작:
> ```bash
> qm stop <vmid>
> qm start <vmid>
> ```

## 6. 고정 IP 재등록

DHCP 재할당 후 UniFi Clients에서 각 서비스에 Fixed IP를 재등록하여 서브넷 변경 이전과 동일한 IP 체계를 복원했다.

| 서비스 | MAC | 고정 IP |
|---|---|---|
| HomeAssistant | `02:04:3D:82:B5:00` | `172.30.1.14` |
| Homebridge | `BC:24:11:45:B0:4E` | `172.30.1.47` |
| tailscale-router | `BC:24:11:09:63:8F` | `172.30.1.50` |
| tapo-door-bell | `18:69:45:7C:09:09` | `172.30.1.66` |

경로: `Clients → [기기 선택] → Fixed IP 토글 → IP 입력`

![UniFi Clients에서 Fixed IP를 설정하는 화면](https://res.cloudinary.com/bx1ml39u/image/upload/v1783949333/kwakky1-blog/2026-07-13-kt-to-unifi-migration/fkifmzjbq9pjtevks2js.png)

## 7. 트러블슈팅: Homebridge 하위 기기 IP 재확인

Homebridge 자체는 정상화됐지만, Homebridge가 로컬 프로토콜(miIO 등)로 직접 제어하는 하위 기기들은 별도로 점검이 필요했다. `config.json`에 기기 IP가 하드코딩되어 있는 플러그인의 경우, 그 기기 자체도 서브넷 변경 이후 새 IP를 받으면서 연동이 끊긴다.

**예시: Xiaomi 선풍기 (miio 플러그인)**

```json
"devices": [
    {
        "name": "Xiaomi Smart Standing Fan 2 Pro",
        "ip": "172.30.1.38",
        "token": "...",
        "model": "dmaker.fan.p33"
    }
]
```

이 IP(`172.30.1.38`)는 config.json에 고정 문자열로 박혀 있어서, 실제 기기가 DHCP로 다른 IP(`172.30.1.242`)를 받는 순간 Homebridge에서 응답이 끊긴다.

### 진단

UniFi Clients에서 제조사(Xiaomi 등) 또는 기기명으로 검색해 현재 실제 IP를 확인한다.

```bash
# 또는 miio 기기 스캔으로 직접 탐색
pip install python-miio --break-system-packages
miiocli discover --handshake

# 혹은 nmap으로 miIO UDP 포트(54321) 스캔
nmap -sU -p 54321 172.30.1.0/24 --open
```

### 해결

두 가지 방식 중 하나를 선택한다.

**A) UniFi에서 예전 IP로 재고정 (config.json 수정 불필요, 권장)**
- Clients → 해당 기기 → Fixed IP → `172.30.1.38` 재입력
- 기기 전원을 껐다 켜서 DHCP 재요청을 유도하면 예약된 IP를 받는다

**B) config.json을 현재 IP로 수정**
- Homebridge 웹 UI에서 플러그인 설정의 IP 필드를 새 IP로 변경 후 UniFi에서 그 IP를 Fixed IP로 고정

### 교훈

로컬 프로토콜(miIO, ESPHome 등 IP 하드코딩 방식)로 연동된 하위 기기가 있는 경우, 상위 허브(Homebridge)의 정상화만으로는 충분하지 않다. 서브넷 마이그레이션 체크리스트에 **"config에 IP가 박힌 하위 기기 목록"**을 별도로 관리해야 재발을 막을 수 있다.

## 8. 최종 검증

```bash
# 게이트웨이 라우팅 정상 확인
ip route show
# default via 172.30.1.1 dev eth0

# 외부 연결 정상 확인
ping -c 3 8.8.8.8

# Tailscale 상태 정상 확인
tailscale status
```

![복구 후 모든 노드가 online으로 표시되는 tailscale status](https://res.cloudinary.com/bx1ml39u/image/upload/v1783949334/kwakky1-blog/2026-07-13-kt-to-unifi-migration/yhjo03bmw9vbxm5m6b23.png)

- 로컬 네트워크에서 HomeAssistant(`172.30.1.14:8123`) 접속 확인
- 클라이언트 기기에서 WiFi 비활성화 후 Tailscale 경유 원격 접속 확인 완료

## 회고 / 체크리스트

서브넷을 변경할 계획이 있다면 아래를 사전에 점검하는 것이 시간을 절약한다.

- [ ] 정적 게이트웨이가 설정된 모든 LXC/VM의 `net0` 설정을 사전에 확인 (`pct config <id> | grep net`, `qm config <id> | grep net`)
- [ ] DHCP 기반 게스트도 서브넷 변경 시 재부팅이 필요할 수 있음을 감안해 일정 잡기
- [ ] Tailscale 서브넷 라우터의 `advertise-routes` 대역이 변경 후에도 유효한지 확인
- [ ] 변경 전후로 각 서비스의 MAC 주소를 기록해두면 Fixed IP 복원이 훨씬 수월함
- [ ] Homebridge 등 허브 플러그인의 `config.json`에서 IP가 하드코딩된 하위 기기 목록을 사전에 파악 (`grep -iE "ip|host|address" config.json`)
