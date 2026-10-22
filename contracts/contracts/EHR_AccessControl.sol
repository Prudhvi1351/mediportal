// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EHR_AccessControl {
    struct Record {
        string ipfsCid;
        uint256 timestamp;
        address patient;
    }

    // Mapping from patient address -> record ID -> Record
    mapping(address => mapping(uint256 => Record)) private patientRecords;
    
    // Mapping to track total records per patient
    mapping(address => uint256) public patientRecordCount;

    // Access control mapping: patient -> doctor -> hasAccess
    mapping(address => mapping(address => bool)) public doctorAccess;

    address public systemAuthenticator;

    event RecordAdded(address indexed patient, uint256 recordId, string ipfsCid, uint256 timestamp);
    event AccessGranted(address indexed patient, address indexed doctor);
    event AccessRevoked(address indexed patient, address indexed doctor);
    event EmergencyAccessTriggered(address indexed doctor, string patientId, uint256 timestamp);

    constructor() {
        systemAuthenticator = msg.sender;
    }

    modifier onlyPatient(address patient) {
        require(msg.sender == patient, "Unauthorized: Only patient can perform this action");
        _;
    }

    modifier onlySystemAuthenticator() {
        require(msg.sender == systemAuthenticator, "Unauthorized: Only System Authenticator");
        _;
    }

    function grantEmergencyAccess(address _patientWallet, string memory _patientId, address _doctor) public onlySystemAuthenticator {
        doctorAccess[_patientWallet][_doctor] = true;
        emit EmergencyAccessTriggered(_doctor, _patientId, block.timestamp);
    }

    function addRecord(string memory _ipfsCid) public {
        uint256 recordId = patientRecordCount[msg.sender];
        patientRecords[msg.sender][recordId] = Record({
            ipfsCid: _ipfsCid,
            timestamp: block.timestamp,
            patient: msg.sender
        });
        patientRecordCount[msg.sender]++;

        emit RecordAdded(msg.sender, recordId, _ipfsCid, block.timestamp);
    }

    function grantAccess(address _doctorId) public {
        doctorAccess[msg.sender][_doctorId] = true;
        emit AccessGranted(msg.sender, _doctorId);
    }

    function revokeAccess(address _doctorId) public {
        doctorAccess[msg.sender][_doctorId] = false;
        emit AccessRevoked(msg.sender, _doctorId);
    }

    function getRecord(address _patient, uint256 _recordId) public view returns (string memory, uint256) {
        require(
            msg.sender == _patient || doctorAccess[_patient][msg.sender],
            "Unauthorized: You do not have access to this record"
        );
        require(_recordId < patientRecordCount[_patient], "Record does not exist");

        Record memory rec = patientRecords[_patient][_recordId];
        return (rec.ipfsCid, rec.timestamp);
    }
}
