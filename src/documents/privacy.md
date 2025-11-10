*Last Updated: 03/11/2025*

## 1. Introduction

Welcome to PigeonTransfer.com ("we," "our," or "us"). We operate a peer-to-peer file transfer service that uses WebRTC technology to facilitate direct file transfers between users. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.

## 2. Our Core Privacy Principle

**We never store your actual file content on our servers.** Files are transferred directly between users' devices using WebRTC technology and remain exclusively on the users' computers throughout the transfer process.

## 3. Information We Collect

### 3.1 Transfer Metadata
We collect and store the following metadata to operate our service:

- **Transfer ID**: Unique serial identifier
- **Access Code**: 6-character unique code for transfer access
- **File Information**: 
  - File name
  - File size (in bytes)
  - MIME type
- **Security Data**:
  - Password (hashed using bcrypt)
  - File checksum (SHA-256 hash)
  - Verification token
  - Virus check status and scan ID
- **Transfer Status**:
  - Completion status
  - WebRTC connection data (offer and answer)
  - Creation timestamp
  - Expiration timestamp

### 3.2 Technical Information
We may collect:
- IP addresses for operational purposes
- Browser type and version
- Operating system
- Timestamps of service usage

## 4. How We Use Your Information

We use the collected information to:

- Facilitate peer-to-peer file transfers
- Generate unique access codes for transfers
- Verify file integrity using checksums
- Provide password protection for transfers
- Conduct security checks
- Monitor transfer completion status
- Maintain service functionality and improve user experience

## 5. Data Retention and Minimization

### 5.1 During Active Transfer
During an active file transfer, we maintain the complete metadata record to enable the WebRTC connection and transfer process.

### 5.2 After Transfer Completion
Once a file transfer is marked as complete, we immediately remove sensitive and unnecessary data from our records:

```typescript
// Data removed after transfer completion:
- WebRTC offer data
- WebRTC answer data
- File name
- MIME type
- Password (if any)
- Verification token
```

We retain only minimal metadata necessary for:
- Service analytics
- Security auditing
- Compliance with legal obligations

## 6. Third-Party Services

### 6.1 VirusTotal Integration
We use VirusTotal to check file checksums against known malicious files. Important notes:

- **We only share file checksums (hashes) with VirusTotal**
- **We never upload actual file content to VirusTotal**
- Files unknown to VirusTotal (new checksums) cannot be scanned for malware
- Transfers are blocked for files previously flagged as malicious by VirusTotal

### 6.2 Service Providers
We may use third-party service providers to:
- Host our website and databases
- Monitor service performance
- Provide customer support

## 7. Data Security

We implement appropriate technical and organizational measures to protect your data, including:

- Password hashing using bcrypt
- Secure WebRTC connections
- Regular security assessments
- Data minimization practices
- Automatic data cleanup procedures

## 8. Your Rights

Depending on your jurisdiction, you may have the right to:

- Access personal information we hold about you
- Request correction of inaccurate data
- Request deletion of your data
- Object to processing of your data
- Data portability

To exercise these rights, please contact us using the information in Section 11.

## 9. International Data Transfers

As a web-based service, your data may be processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.

## 10. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.

## 11. Contact Us

If you have any questions about this Privacy Policy or our data practices, please contact us at:

**Email:** support@pigontransfer.com

## 12. Legal Compliance

We will disclose your information where required to do so by law or in response to valid requests by public authorities.

#

*This Privacy Policy applies only to our online activities and is valid for visitors to our website and users of our service regarding the information they share with PigeonTransfer.com.*
