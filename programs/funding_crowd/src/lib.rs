use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;

declare_id!("8RDzRfUrfsLdWEnJLgGPPyiAmBxcykjNhMCEabUAAhQf");

#[program]
pub mod funding_crowd {
    use super::*;

    pub fn create(ctx: Context<Create>, name: String, description: String) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign;
        campaign.name = name;
        campaign.description = description;
        campaign.amount_donated = 0;
        campaign.admin= *ctx.accounts.user.key;
        Ok(())
    }

    //*! variables do not like being mut
    pub fn donate(ctx: Context<Donate>, amount: u64) -> ProgramResult {
        // We must make a transaction like this becuase we are initiating a transaction from a user
        // That is an account we don't have authorization for
        let instruction = anchor_lang::solana_program::system_instruction::transfer(
            // to
            &ctx.accounts.user.key(),  
            //from
            &ctx.accounts.campaign.key(),
            //amount
            amount
        );
        anchor_lang::solana_program::program::invoke(
            &instruction,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.campaign.to_account_info(),
            ]
        )?;
        // how to change a value in a struct
        (&mut ctx.accounts.campaign).amount_donated += amount;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign;
        let user = &mut ctx.accounts.user;
        // ensures that the key the user is using is the programId
        if campaign.admin != *user.key {
            return Err(ProgramError::IncorrectProgramId)
        }
        let rent_balance = Rent::get()?.minimum_balance(campaign.to_account_info().data_len());
        if **campaign.to_account_info().lamports.borrow() - rent_balance < amount {
            return Err(ProgramError::InsufficientFunds)
        }
        // This is the same reason we don't need System Program
        // Here we can transfer funds like this becuase we are sending value from the PDA
        // We don't need authorization to send funds from an account we own
        **campaign.to_account_info().try_borrow_mut_lamports()? -= amount;
        **user.to_account_info().try_borrow_mut_lamports()? += amount;
        Ok(())
    }
}


// program derived account
// campaign account needs permission from our code
// specifies that this is a context
#[derive(Accounts)]
pub struct Create<'info> {
    // space means amount of space allocated to account on blockchain
    // space depends on how much data this account will store
    // seeds are keys that the account will make that we can use
    // bump is used to prevents our generate keys from being keys that already exist
    //* this seed limits users to only making on campaign 
    //* We would have to add something else to the seed such as time 
    #[account(init, payer=user, space=9000, seeds=[b"CAMPAIGN_DEMO".as_ref(), user.key().as_ref()], bump)]
    // seeds=[b"CAMPAIGN_DEMO".as_ref(), user.key().as_ref()], bump)]
    pub campaign: Account<'info, Campaign>,
    // The user account is mutable
    // user is the caller of the create function and it will sign the transactions
    #[account(mut)]
    pub user: Signer<'info>, 
    // authorizes user to send money out of their wallet
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Donate<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub user: Signer<'info>,
    // Needed when a user is sending funds
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub user: Signer<'info>
}

#[account]
pub struct Campaign {
    pub admin: Pubkey, 
    pub name: String,
    pub description: String, 
    pub amount_donated: u64
}
