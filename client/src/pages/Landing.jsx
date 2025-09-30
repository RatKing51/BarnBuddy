import React from 'react'
import LargeLandingCard from '../components/LargeLandingCard'
import ReviewLandingCard from '../components/ReviewLandingCard'

export default function Landing() {
  return (
    <div className='bg-[#101D42]'>
        <LargeLandingCard />
        <div className='flex flex-row justify-evenly'>
            <ReviewLandingCard />
            <ReviewLandingCard />
            <ReviewLandingCard />
        </div>
    </div>
  )
}
