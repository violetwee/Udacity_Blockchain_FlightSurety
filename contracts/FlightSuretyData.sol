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

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    struct Airline {
        bool isRegistered;
        bool isFunded;
        uint256 funds;
    }
    mapping(address => Airline) private registeredAirlines; // track registered airlines, for multi-sig and airline ante
    uint256 public totalRegisteredAirlines = 0;

    // Insurance from passengers
    struct Insurance {
        address passenger;
        uint256 insuranceCost;
        uint256 payoutPercentage;
        bool isPayoutCredited;
    }
    mapping(bytes32 => Insurance[]) public flightKeyInsurance; // flightKey=>Insurance[], flights that passengers have bought insurance
    mapping(address => uint256) public passengerCredits; // passenger => insurance payouts in eth, pending withdrawal

    struct Flight {
        address airline;
        string airlineName;
        uint8 statusCode;
        uint256 timestamp;
        bytes32 flightKey;
        string flightNo;
        string departureFrom;
        string arrivalAt;
    }
    mapping(bytes32 => Flight) public flights; // flightKey => Flight

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

    /*                                    PASSENGER FUNCTIONS                                   */
    /********************************************************************************************/
    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy(
        address passenger,
        bytes32 flightKey,
        uint256 cost
    ) external payable requireIsOperational {
        // get airline based on flightKey
        Flight flight = flights[flightKey];

        // pay airline for the insurance
        address(uint160(flight.airline)).transfer(cost);
        flight.funds += cost;

        Insurance insurance = Insurance({
            passenger: passenger,
            insuranceCost: cost,
            payoutPercentage: 150
        });
        flightKeyInsurance[flightKey].push(insurance);
    }

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees(bytes32 flightKey)
        internal
        requireIsOperational
        requireIsCallerAuthorized
    {
        // loop through all insurees and perform credit
        for (uint256 idx = 0; idx < flightKeyInsurance[flightKey]; idx++) {
            Insurance memory insurance = flightKeyInsurance[flightKey][idx];

            if (!insurance.isPayoutCredited) {
                insurance.isPayoutCredited = true;
                // calculate payout amount
                uint256 amount = insurance
                    .insuranceCost
                    .mul(insurance.payoutPercentage)
                    .div(100);

                passengerCredits[insurance.passenger] += amount;
            }
        }
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay(address passenger, bytes32 flightKey)
        external payable
        requireIsOperational
        requireIsCallerAuthorized
    {
        require(
            passengerCredits[passenger] > 0,
            "Passenger do not have credits to withdraw"
        );

        Flight flight = flights[flightKey];
        uint256 credits = passengerCredits[passenger];
        passengerCredits[passenger] = 0;
        address(uint160(passenger)).transfer(amount, { from: flight.airline });
    }

    /*                                    FLIGHT FUNCTIONS                                      */
    /********************************************************************************************/

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
     * @dev Save flight status info
     *
     */
    function processFlightStatus(bytes32 flightKey, uint8 statusCode)
        external
        requireIsOperational
        requireIsCallerAuthorized
    {
        if (flights[flightKey].statusCode == STATUS_CODE_UNKNOWN) {
            flights[flightKey].statusCode = statusCode;

            if (statusCode == STATUS_CODE_LATE_AIRLINE) {
                // airline is late, credit insured amount to passengers
                creditInsurees(flightKey);
            }
        }
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    function() external payable {}
}
