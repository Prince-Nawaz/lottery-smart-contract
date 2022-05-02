const assert = require('assert');
const Web3 = require('web3');
const ganache = require('ganache-cli');

const web3 = new Web3(ganache.provider());
const { abi, evm } = require('../compile');

let accounts;
let lottery;
beforeEach(async () => {
  // Get a list of accounts
  accounts = await web3.eth.getAccounts();

  // Use one of the accounts to deploy a contract
  lottery = await new web3.eth.Contract(abi)
    .deploy({
      data: evm.bytecode.object,
      arguments: [],
    })
    .send({ from: accounts[0], gas: '1000000' });
});

describe('Lottery Contract', () => {
  // console.log(accounts, abi, evm, lottery);
  // console.log(lottery);
  it('Deploys a contract', () => {
    assert.ok(lottery.options.address);
  });

  it('Allows one account to enter', async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('0.02', 'ether'),
    });

    const players = await lottery.methods.getPlayers().call({
      from: accounts[0],
    });
    assert.equal(accounts[0], players[0]);
    assert.equal(1, players.length);
  });

  it('Allows multiples account to enter', async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('0.02', 'ether'),
    });
    await lottery.methods.enter().send({
      from: accounts[1],
      value: web3.utils.toWei('0.02', 'ether'),
    });
    await lottery.methods.enter().send({
      from: accounts[2],
      value: web3.utils.toWei('0.02', 'ether'),
    });

    const players = await lottery.methods.getPlayers().call({
      from: accounts[0],
    });
    assert.equal(accounts[0], players[0]);
    assert.equal(accounts[1], players[1]);
    assert.equal(accounts[2], players[2]);
    assert.equal(3, players.length);
  });

  it('requires a minimum amount of ether to enter', async () => {
    try {
      await lottery.methods.enter().send({
        from: accounts[0],
        value: web3.utils.toWei('0.001', 'ether'),
      });
    } catch (error) {
      assert(error);
      return;
    }
    assert(false);
  });

  it('only manger can call pickWinner', async () => {
    try {
      // At least one person must enter the lottery else pickWinner will fail
      // even if invoked by the manager and this test will pass
      // because the error will be caught by the catch block.
      await lottery.methods.enter().send({
        from: accounts[1],
        value: web3.utils.toWei('0.02', 'ether'),
      });
      await lottery.methods.pickWinner().send({
        from: accounts[1],
        gas: 1000000,
      });
    } catch (error) {
      assert(error);
      return;
    }
    assert(false);
  });

  it('checks there are no players after pick winner', async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('2', 'ether'),
    });

    await lottery.methods.pickWinner().send({
      from: accounts[0],
    });

    const players = await lottery.methods.getPlayers().call();
    console.log('No. of players in contract ', players.length);
    assert(players.length == 0);
  });

  it('checks the lottery balance is empty after pick winner is called', async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('2', 'ether'),
    });

    const initialBalance = await web3.eth.getBalance(accounts[0]);
    await lottery.methods.pickWinner().send({
      from: accounts[0],
    });

    const finalBalance = await web3.eth.getBalance(accounts[0]);
    const difference = finalBalance - initialBalance;
    console.log('Account[0] Difference', difference);

    const balance = await web3.eth.getBalance(lottery.options.address);
    console.log('Balance in contract', balance);

    assert(difference > web3.utils.toWei('1.8', 'ether'));
    assert(balance == 0);
  });
});
