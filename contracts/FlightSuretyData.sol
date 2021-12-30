pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false
    mapping(address => uint256) private authorizedContracts;

    struct Airline {
        bool isRegistered;
        bool isFunded;
        uint256 funds;
    }
    mapping(address => Airline) private registeredAirlines; // track registered airlines, for multi-sig and airline ante
    uint256 public totalRegisteredAirlines = 0;

    // Insurance claims from passengers
    struct Insurance {
        address passenger;
        uint256 insuranceCost;
        uint256 payoutPercentage;
    }
    mapping(bytes32 => Insurance[]) public flightKeyInsurance; // flights that passengers have bought insurance
    mapping(address => uint256) public insurancePayouts; // passenger => insurance payouts in eth

    struct Flight {
        address airline;
        uint8 statusCode;
        uint256 timestamp;
        bytes32 flightKey;
        string flightNo;
        string departureFrom;
        string arrivalAt;
    }
    mapping(address => Flight) public flights;

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor(address airlineAddress) public {
        contractOwner = msg.sender;
        registeredAirlines[airlineAddress] = Airline(true, false, 0); // initialise and register first airline
        ++totalRegisteredAirlines;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
     * @dev Modifier that requires the function caller to be an authorized account
     */
    modifier requireIsCallerAuthorized() {
        require(
            authorizedContracts[msg.sender] == 1,
            "Caller is not authorized"
        );
        _;
    }

    /**
     * @dev Modifier that requires the airline to be registered (may not be funded yet)
     */
    modifier requireAirlineIsRegistered(address airlineAddress) {
        require(
            registeredAirlines[airlineAddress].isRegistered == true,
            "Caller is not a registered airline"
        );
        _;
    }

    /**
     * @dev Modifier that requires the ariline to be funded
     */
    modifier requireAirlineIsFunded(address airlineAddress) {
        require(
            registeredAirlines[airlineAddress].isFunded == true,
            "Caller's account is not funded yet"
        );
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */
    function isOperational() public view returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) public requireContractOwner {
        operational = mode;
    }

    /**
     * @dev Authorize a contract address (FlightSuretyApp contract)
     */
    function authorizeContract(address contractAddress)
        public
        requireContractOwner
    {
        authorizedContracts[contractAddress] = 1;
    }

    /**
     * @dev Deauthorize a contract address (FlightSuretyApp contract)
     */
    function deauthorizeContract(address contractAddress)
        public
        requireContractOwner
    {
        delete authorizedContracts[contractAddress];
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /*                                    AIRLINE FUNCTIONS                                     */
    /********************************************************************************************/
    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *      Only funded airlines can be
     */
    function registerAirline(address newAirlineAddress)
        external
        requireIsOperational
        requireIsCallerAuthorized
    {
        // Check that airline is not already registered
        require(
            !registeredAirlines[newAirlineAddress].isRegistered,
            "Airline is already registered"
        );

        registeredAirlines[newAirlineAddress] = Airline({
            isRegistered: true,
            isFunded: false,
            funds: 0
        });
        ++totalRegisteredAirlines;
    }

    /**
     * @dev Check an airline's registration status
     *
     */
    function isRegisteredAirline(address airlineAddress)
        external
        view
        requireIsOperational
        returns (bool)
    {
        return registeredAirlines[airlineAddress].isRegistered;
    }

    /**
     * @dev Check an airline's funding status
     *
     */
    function isFundedAirline(address airlineAddress)
        external
        view
        requireIsOperational
        returns (bool)
    {
        return registeredAirlines[airlineAddress].isFunded;
    }

    /**
     * @dev Check an airline's funding amount
     *
     */
    function getFundsForAirline(address airlineAddress)
        external
        view
        requireIsOperational
        returns (uint256)
    {
        return registeredAirlines[airlineAddress].funds;
    }

    /**
     * @dev Get total number of registered airlines
     *
     */
    function getTotalRegisteredAirlines()
        external
        view
        requireIsOperational
        returns (uint256)
    {
        return totalRegisteredAirlines;
    }

    /*                                    PASSENGER FUNCTIONS                                     */
    /********************************************************************************************/
    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy() external payable {}

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees() external pure {}

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay() external pure {}

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund(address airlineAddress, uint256 amount)
        external
        payable
        requireIsOperational
    {
        require(
            registeredAirlines[airlineAddress].isRegistered,
            "Airline is not registered yet"
        );
        registeredAirlines[airlineAddress].isFunded = true;
        registeredAirlines[airlineAddress].funds = amount;
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    function() external payable {}
}
